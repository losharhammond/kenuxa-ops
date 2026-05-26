/**
 * KENUXA OPS — Outlook-First Email Execution via Microsoft Graph API
 *
 * Handles all email operations through the Microsoft Graph REST API.
 * Prioritises Outlook/Exchange but gracefully falls back to logging
 * when credentials aren't configured.
 *
 * Required env vars:
 *   KENUXA_MS_TENANT_ID     — Azure AD tenant ID
 *   KENUXA_MS_CLIENT_ID     — App registration client ID
 *   KENUXA_MS_CLIENT_SECRET — App registration client secret  (for daemon/app auth)
 *   KENUXA_MS_USER_EMAIL    — Mailbox to send from (e.g. ops@kenuxa.ai)
 *
 *   OR for delegated/user auth:
 *   KENUXA_MS_ACCESS_TOKEN  — Short-lived user access token
 *   KENUXA_MS_REFRESH_TOKEN — Refresh token for auto-renewal
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmailAddress {
  address: string;
  name?: string;
}

export interface EmailAttachment {
  name: string;
  contentType: string;
  /** base64-encoded content */
  contentBytes: string;
}

export interface SendEmailParams {
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  body: string;
  /** 'html' | 'text'. Default: 'html' */
  contentType?: "html" | "text";
  attachments?: EmailAttachment[];
  /** If true, sends and saves a copy. Default: true */
  saveToSentItems?: boolean;
}

export interface SearchEmailParams {
  query: string;
  /** Max results. Default: 20 */
  top?: number;
  /** Mail folder. Default: 'Inbox' */
  folder?: string;
  /** Filter expression (OData). Optional. */
  filter?: string;
}

export interface EmailMessage {
  id: string;
  subject: string;
  from: EmailAddress;
  toRecipients: EmailAddress[];
  receivedDateTime: string;
  bodyPreview: string;
  isRead: boolean;
  hasAttachments: boolean;
  webLink: string;
}

export interface ReplyEmailParams {
  messageId: string;
  comment: string;
  replyAll?: boolean;
}

export interface EmailExecutorResult<T = void> {
  ok: boolean;
  data?: T;
  error?: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface OutlookExecutorConfig {
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  userEmail?: string;
  accessToken?: string;
  /** Called when a new access token is obtained. */
  onTokenRefresh?: (token: string, expiresAt: Date) => void;
}

function resolveConfig(override: OutlookExecutorConfig = {}): OutlookExecutorConfig {
  return {
    tenantId:     override.tenantId     ?? process.env["KENUXA_MS_TENANT_ID"],
    clientId:     override.clientId     ?? process.env["KENUXA_MS_CLIENT_ID"],
    clientSecret: override.clientSecret ?? process.env["KENUXA_MS_CLIENT_SECRET"],
    userEmail:    override.userEmail    ?? process.env["KENUXA_MS_USER_EMAIL"],
    accessToken:  override.accessToken  ?? process.env["KENUXA_MS_ACCESS_TOKEN"],
    onTokenRefresh: override.onTokenRefresh,
  };
}

// ─── Executor ─────────────────────────────────────────────────────────────────

export class OutlookEmailExecutor {
  private _token: string | null = null;
  private _tokenExpiresAt: Date | null = null;

  constructor(private readonly cfg: OutlookExecutorConfig = {}) {
    this.cfg = resolveConfig(cfg);
  }

  /** True when basic credentials are configured. */
  get isConfigured(): boolean {
    const c = this.cfg;
    return Boolean(
      (c.tenantId && c.clientId && c.clientSecret) ||
      c.accessToken,
    );
  }

  // ── Email operations ──────────────────────────────────────────────────────

  async sendEmail(params: SendEmailParams): Promise<EmailExecutorResult> {
    const token = await this._getToken();
    if (!token) return this._notConfigured();

    const payload = {
      message: {
        subject: params.subject,
        body: {
          contentType: params.contentType === "text" ? "Text" : "HTML",
          content: params.body,
        },
        toRecipients: params.to.map(toGraphRecipient),
        ccRecipients:  (params.cc  ?? []).map(toGraphRecipient),
        bccRecipients: (params.bcc ?? []).map(toGraphRecipient),
        attachments: (params.attachments ?? []).map((a) => ({
          "@odata.type":  "#microsoft.graph.fileAttachment",
          name:           a.name,
          contentType:    a.contentType,
          contentBytes:   a.contentBytes,
        })),
      },
      saveToSentItems: params.saveToSentItems ?? true,
    };

    return this._graphPost(`/users/${this._userEmail}/sendMail`, payload, token);
  }

  async searchEmails(params: SearchEmailParams): Promise<EmailExecutorResult<EmailMessage[]>> {
    const token = await this._getToken();
    if (!token) return this._notConfigured();

    const top    = params.top    ?? 20;
    const folder = params.folder ?? "Inbox";
    const qs = new URLSearchParams({
      $search: `"${params.query}"`,
      $top:    String(top),
      $select: "id,subject,from,toRecipients,receivedDateTime,bodyPreview,isRead,hasAttachments,webLink",
      $orderby: "receivedDateTime desc",
    });
    if (params.filter) {
      qs.set("$filter", params.filter);
    }

    const result = await this._graphGet<{ value: unknown[] }>(
      `/users/${this._userEmail}/mailFolders/${folder}/messages?${qs}`,
      token,
    );
    if (!result.ok) return result as EmailExecutorResult<EmailMessage[]>;
    return { ok: true, data: (result.data?.["value"] ?? []) as EmailMessage[] };
  }

  async replyToEmail(params: ReplyEmailParams): Promise<EmailExecutorResult> {
    const token = await this._getToken();
    if (!token) return this._notConfigured();

    const endpoint = params.replyAll
      ? `/users/${this._userEmail}/messages/${params.messageId}/replyAll`
      : `/users/${this._userEmail}/messages/${params.messageId}/reply`;

    return this._graphPost(endpoint, { comment: params.comment }, token);
  }

  async markAsRead(messageId: string): Promise<EmailExecutorResult> {
    const token = await this._getToken();
    if (!token) return this._notConfigured();
    return this._graphPatch(
      `/users/${this._userEmail}/messages/${messageId}`,
      { isRead: true },
      token,
    );
  }

  async getEmailById(messageId: string): Promise<EmailExecutorResult<EmailMessage>> {
    const token = await this._getToken();
    if (!token) return this._notConfigured();
    return this._graphGet<EmailMessage>(
      `/users/${this._userEmail}/messages/${messageId}`,
      token,
    );
  }

  // ── Token management ──────────────────────────────────────────────────────

  private async _getToken(): Promise<string | null> {
    // 1. If a static access token is provided, use it
    if (this.cfg.accessToken && !this.cfg.clientSecret) {
      return this.cfg.accessToken;
    }
    // 2. If we have a cached token that hasn't expired, reuse it
    if (this._token && this._tokenExpiresAt && new Date() < this._tokenExpiresAt) {
      return this._token;
    }
    // 3. Try client-credentials flow (app-level daemon auth)
    if (this.cfg.tenantId && this.cfg.clientId && this.cfg.clientSecret) {
      return this._fetchClientCredentialsToken();
    }
    return null;
  }

  private async _fetchClientCredentialsToken(): Promise<string | null> {
    try {
      const url = `https://login.microsoftonline.com/${this.cfg.tenantId}/oauth2/v2.0/token`;
      const body = new URLSearchParams({
        grant_type:    "client_credentials",
        client_id:     this.cfg.clientId!,
        client_secret: this.cfg.clientSecret!,
        scope:         "https://graph.microsoft.com/.default",
      });

      const res  = await fetch(url, {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body:    body.toString(),
      });
      const json = await res.json() as Record<string, unknown>;

      if (!res.ok || !json["access_token"]) {
        console.error("[kenuxa-ops] MS Graph token fetch failed:", json["error_description"]);
        return null;
      }

      this._token = json["access_token"] as string;
      const expiresIn = (json["expires_in"] as number) ?? 3600;
      this._tokenExpiresAt = new Date(Date.now() + (expiresIn - 60) * 1000);
      this.cfg.onTokenRefresh?.(this._token, this._tokenExpiresAt);
      return this._token;
    } catch (err) {
      console.error("[kenuxa-ops] MS Graph token fetch error:", err);
      return null;
    }
  }

  // ── Graph HTTP helpers ────────────────────────────────────────────────────

  private get _userEmail(): string {
    return this.cfg.userEmail ?? "me";
  }

  private async _graphGet<T>(path: string, token: string): Promise<EmailExecutorResult<T>> {
    return this._graphRequest<T>("GET", path, undefined, token);
  }

  private async _graphPost<T = void>(path: string, body: unknown, token: string): Promise<EmailExecutorResult<T>> {
    return this._graphRequest<T>("POST", path, body, token);
  }

  private async _graphPatch<T = void>(path: string, body: unknown, token: string): Promise<EmailExecutorResult<T>> {
    return this._graphRequest<T>("PATCH", path, body, token);
  }

  private async _graphRequest<T>(
    method: string,
    path: string,
    body: unknown,
    token: string,
  ): Promise<EmailExecutorResult<T>> {
    try {
      const url = `https://graph.microsoft.com/v1.0${path}`;
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) {
        const errBody = await res.text();
        return { ok: false, error: `Graph API ${method} ${path} → ${res.status}: ${errBody}` };
      }

      if (res.status === 202 || res.status === 204) {
        // No-content responses (sendMail, reply) are success
        return { ok: true } as EmailExecutorResult<T>;
      }

      const data = await res.json() as T;
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  private _notConfigured<T = void>(): EmailExecutorResult<T> {
    return {
      ok: false,
      error:
        "KENUXA OPS Outlook executor not configured. " +
        "Set KENUXA_MS_TENANT_ID, KENUXA_MS_CLIENT_ID, KENUXA_MS_CLIENT_SECRET, KENUXA_MS_USER_EMAIL.",
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toGraphRecipient(addr: EmailAddress) {
  return {
    emailAddress: {
      address: addr.address,
      name:    addr.name ?? addr.address,
    },
  };
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _shared: OutlookEmailExecutor | null = null;

export function getOutlookExecutor(config?: OutlookExecutorConfig): OutlookEmailExecutor {
  if (!_shared) {
    _shared = new OutlookEmailExecutor(config);
  }
  return _shared;
}
