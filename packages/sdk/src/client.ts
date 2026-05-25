/**
 * @kenuxa/sdk — Base HTTP Client
 */

import type { KenuxaConfig, KenuxaResponse } from "./types.js";

export class KenuxaClient {
  protected config: Required<Pick<KenuxaConfig, "coreUrl">> & KenuxaConfig;

  constructor(config: KenuxaConfig) {
    this.config = {
      app: "core",
      timeout: 30_000,
      ...config,
    };
  }

  protected buildHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.token) {
      headers["Authorization"] = `Bearer ${this.config.token}`;
    } else if (this.config.apiKey) {
      headers["X-API-Key"] = this.config.apiKey;
    }

    if (this.config.organizationId) {
      headers["X-Organization-ID"] = this.config.organizationId;
    }

    return headers;
  }

  protected url(path: string, params?: Record<string, string | number | undefined>): string {
    const base = this.config.coreUrl.replace(/\/$/, "");
    const url  = new URL(`${base}${path}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }

  async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<KenuxaResponse<T>> {
    const res = await fetch(this.url(path, params), {
      method: "GET",
      headers: this.buildHeaders(),
      signal: AbortSignal.timeout(this.config.timeout ?? 30_000),
    });
    return res.json() as Promise<KenuxaResponse<T>>;
  }

  async post<T>(path: string, body?: unknown): Promise<KenuxaResponse<T>> {
    const res = await fetch(this.url(path), {
      method: "POST",
      headers: this.buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.config.timeout ?? 30_000),
    });
    return res.json() as Promise<KenuxaResponse<T>>;
  }

  async patch<T>(path: string, body?: unknown, params?: Record<string, string | undefined>): Promise<KenuxaResponse<T>> {
    const res = await fetch(this.url(path, params), {
      method: "PATCH",
      headers: this.buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.config.timeout ?? 30_000),
    });
    return res.json() as Promise<KenuxaResponse<T>>;
  }

  async delete<T>(path: string, params?: Record<string, string | undefined>): Promise<KenuxaResponse<T>> {
    const res = await fetch(this.url(path, params), {
      method: "DELETE",
      headers: this.buildHeaders(),
      signal: AbortSignal.timeout(this.config.timeout ?? 30_000),
    });
    return res.json() as Promise<KenuxaResponse<T>>;
  }
}
