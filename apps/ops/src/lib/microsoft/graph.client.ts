/**
 * KENUXA OPS — Microsoft Graph API Client (Phase 4)
 *
 * Handles Outlook email as the PRIMARY email provider.
 * Uses OAuth2 client-credentials (app-level) or user-delegated tokens.
 *
 * Token flow:
 *  1. User completes OAuth at /api/auth/microsoft
 *  2. Access token stored in Supabase: microsoft_tokens(user_id, access_token, refresh_token, expires_at)
 *  3. getAccessToken() checks expiry → refreshes automatically → returns valid token
 *
 * Graceful degradation: all functions return { error } objects when not configured.
 */

const GRAPH_BASE     = 'https://graph.microsoft.com/v1.0'
const TOKEN_ENDPOINT = `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID ?? 'common'}/oauth2/v2.0/token`

// ── Config check ───────────────────────────────────────────────────────────────

export function isMicrosoftConfigured(): boolean {
  return !!(
    process.env.MICROSOFT_CLIENT_ID &&
    process.env.MICROSOFT_CLIENT_SECRET
  )
}

// ── Token management ───────────────────────────────────────────────────────────

interface TokenRecord {
  access_token:  string
  refresh_token: string
  expires_at:    string   // ISO string
}

/** Retrieve stored tokens for a user from Supabase */
async function getStoredTokens(userId: string): Promise<TokenRecord | null> {
  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('microsoft_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userId)
      .single()
    if (error || !data) return null
    return data as TokenRecord
  } catch {
    return null
  }
}

/** Store/refresh tokens in Supabase */
async function saveTokens(userId: string, tokens: TokenRecord): Promise<void> {
  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabase = await createServiceClient()
    await supabase.from('microsoft_tokens').upsert({
      user_id:       userId,
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at:    tokens.expires_at,
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'user_id' })
  } catch (err) {
    console.warn('[graph] Failed to save tokens:', (err as Error).message)
  }
}

/** Refresh an expired access token using the refresh token */
async function refreshAccessToken(
  userId: string,
  refreshToken: string
): Promise<string | null> {
  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        grant_type:    'refresh_token',
        refresh_token: refreshToken,
        scope:         'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access',
      }),
    })

    if (!res.ok) return null

    const data = await res.json() as {
      access_token:  string
      refresh_token?: string
      expires_in:    number
    }

    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
    await saveTokens(userId, {
      access_token:  data.access_token,
      refresh_token: data.refresh_token ?? refreshToken,
      expires_at:    expiresAt,
    })

    return data.access_token
  } catch {
    return null
  }
}

/** Get a valid access token for the user — auto-refreshes if expired */
export async function getAccessToken(userId: string): Promise<string | null> {
  if (!isMicrosoftConfigured()) return null

  const stored = await getStoredTokens(userId)
  if (!stored) return null

  // Check if token is still valid (5-minute buffer)
  const expiresAt = new Date(stored.expires_at).getTime()
  if (Date.now() < expiresAt - 5 * 60 * 1000) {
    return stored.access_token
  }

  // Token expired — refresh
  return refreshAccessToken(userId, stored.refresh_token)
}

// ── OAuth2 Authorization URL ───────────────────────────────────────────────────

export function getAuthorizationUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id:     process.env.MICROSOFT_CLIENT_ID ?? '',
    response_type: 'code',
    redirect_uri:  process.env.MICROSOFT_REDIRECT_URI
                   ?? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/microsoft/callback`,
    scope:         'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access User.Read',
    response_mode: 'query',
    ...(state ? { state } : {}),
  })
  return `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID ?? 'common'}/oauth2/v2.0/authorize?${params}`
}

/** Exchange authorization code for tokens */
export async function exchangeCodeForTokens(
  userId: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        grant_type:    'authorization_code',
        code,
        redirect_uri:  process.env.MICROSOFT_REDIRECT_URI
                       ?? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/microsoft/callback`,
        scope:         'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access User.Read',
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return { success: false, error: err.slice(0, 200) }
    }

    const data = await res.json() as {
      access_token:  string
      refresh_token: string
      expires_in:    number
    }

    await saveTokens(userId, {
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
      expires_at:    new Date(Date.now() + data.expires_in * 1000).toISOString(),
    })

    return { success: true }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

// ── Core Graph API helper ──────────────────────────────────────────────────────

async function graphRequest<T>(
  userId: string,
  path:   string,
  opts?: RequestInit
): Promise<T & { _error?: string }> {
  const token = await getAccessToken(userId)
  if (!token) {
    return { _error: 'No Microsoft access token — user must connect Outlook first' } as T & { _error: string }
  }

  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...opts,
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...((opts?.headers as Record<string, string>) ?? {}),
    },
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText)
    return { _error: `Graph API ${res.status}: ${errText.slice(0, 200)}` } as T & { _error: string }
  }

  return res.json() as Promise<T & { _error?: string }>
}

// ── Mail operations ────────────────────────────────────────────────────────────

export interface GraphMessage {
  id:             string
  subject:        string
  bodyPreview:    string
  receivedDateTime: string
  isRead:         boolean
  importance:     string
  hasAttachments: boolean
  from:           { emailAddress: { name: string; address: string } }
  toRecipients:   { emailAddress: { name: string; address: string } }[]
  body?:          { contentType: string; content: string }
}

export async function listMessages(
  userId: string,
  opts?: { top?: number; filter?: string; select?: string }
): Promise<{ messages: GraphMessage[]; error?: string }> {
  const params = new URLSearchParams({
    $top:     String(opts?.top ?? 20),
    $orderby: 'receivedDateTime desc',
    $select:  opts?.select ?? 'id,subject,bodyPreview,receivedDateTime,isRead,importance,hasAttachments,from,toRecipients',
    ...(opts?.filter ? { $filter: opts.filter } : {}),
  })

  const data = await graphRequest<{ value?: GraphMessage[]; _error?: string }>(
    userId, `/me/messages?${params}`
  )

  if (data._error) return { messages: [], error: data._error }
  return { messages: data.value ?? [] }
}

export async function getMessage(
  userId:    string,
  messageId: string
): Promise<{ message?: GraphMessage; error?: string }> {
  const data = await graphRequest<GraphMessage & { _error?: string }>(
    userId, `/me/messages/${messageId}`
  )
  if (data._error) return { error: data._error }
  return { message: data }
}

export async function sendMessage(
  userId:  string,
  payload: {
    to:      string | string[]
    subject: string
    body:    string
    cc?:     string | string[]
    isHtml?: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  const toArray  = Array.isArray(payload.to) ? payload.to : [payload.to]
  const ccArray  = payload.cc
    ? (Array.isArray(payload.cc) ? payload.cc : [payload.cc])
    : []

  const message = {
    subject: payload.subject,
    importance: 'Normal',
    body: {
      contentType: payload.isHtml ? 'HTML' : 'Text',
      content:     payload.body,
    },
    toRecipients: toArray.map(addr => ({
      emailAddress: { address: addr },
    })),
    ...(ccArray.length ? {
      ccRecipients: ccArray.map(addr => ({
        emailAddress: { address: addr },
      })),
    } : {}),
  }

  const data = await graphRequest<{ _error?: string }>(userId, '/me/sendMail', {
    method: 'POST',
    body:   JSON.stringify({ message, saveToSentItems: true }),
  })

  if (data._error) return { success: false, error: data._error }
  return { success: true }
}

export async function markAsRead(
  userId:    string,
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  const data = await graphRequest<{ _error?: string }>(
    userId,
    `/me/messages/${messageId}`,
    { method: 'PATCH', body: JSON.stringify({ isRead: true }) }
  )
  if (data._error) return { success: false, error: data._error }
  return { success: true }
}

// ── Outlook connection status ──────────────────────────────────────────────────

export async function getOutlookStatus(userId: string): Promise<{
  connected: boolean
  email?: string
  error?: string
}> {
  if (!isMicrosoftConfigured()) {
    return { connected: false, error: 'Microsoft credentials not configured' }
  }

  const token = await getAccessToken(userId)
  if (!token) return { connected: false, error: 'No access token — connect Outlook first' }

  const data = await graphRequest<{ userPrincipalName?: string; _error?: string }>(
    userId, '/me?$select=userPrincipalName,displayName'
  )

  if (data._error) return { connected: false, error: data._error }
  return { connected: true, email: data.userPrincipalName }
}
