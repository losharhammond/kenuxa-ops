/**
 * KENUXA OPS → CORE Connector
 * CORE is a separate platform. OPS connects via REST APIs.
 */

const CORE_URL    = process.env.KENUXA_CORE_URL    ?? 'http://localhost:3000'
const SERVICE_KEY = process.env.KENUXA_CORE_API_KEY ?? ''

interface CoreRequestOptions {
  path:   string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?:  unknown
  token?: string  // user JWT for auth'd requests
}

async function callCore<T>(opts: CoreRequestOptions): Promise<T> {
  const res = await fetch(`${CORE_URL}${opts.path}`, {
    method:  opts.method ?? 'GET',
    headers: {
      'Content-Type':  'application/json',
      'X-Service-Key': SERVICE_KEY,
      'X-App':         'ops',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`CORE API ${opts.method ?? 'GET'} ${opts.path} → ${res.status}: ${err}`)
  }

  return res.json() as Promise<T>
}

// ── Auth & Identity ────────────────────────────────────────────────────────────

export async function verifyToken(token: string): Promise<{ userId: string; orgId?: string } | null> {
  try {
    return await callCore<{ userId: string; orgId?: string }>({
      path:   '/api/auth/verify',
      method: 'POST',
      body:   { token },
    })
  } catch {
    return null
  }
}

export async function getUserContext(token: string): Promise<{
  user: { id: string; email: string; name?: string }
  org?:  { id: string; name: string }
  wallet?: { balance: number; currency: string }
} | null> {
  try {
    return await callCore({ path: '/api/auth/me', token })
  } catch {
    return null
  }
}

// ── AI Gateway (optional — OPS uses own Groq key primarily) ───────────────────

export async function coreAI(request: {
  task:     string
  prompt:   string
  tier?:    'fast' | 'balanced' | 'powerful'
  orgId?:   string
}, token: string): Promise<{ content: string; model: string; cost?: number }> {
  return callCore({
    path:   '/api/ai',
    method: 'POST',
    body:   { app: 'ops', ...request },
    token,
  })
}

// ── Events ─────────────────────────────────────────────────────────────────────

export async function emitEvent(event: {
  type:    string
  payload: Record<string, unknown>
  orgId?:  string
}): Promise<void> {
  try {
    await callCore({ path: '/api/events', method: 'POST', body: event })
  } catch (err) {
    console.error('[core-connector] Failed to emit event:', err)
  }
}

// ── Intelligence (REACH) ───────────────────────────────────────────────────────

export async function searchReach(query: string, token: string): Promise<{
  data: Array<{ title: string; summary: string; country?: string }>
  total: number
}> {
  return callCore({
    path:   `/api/reach/search?q=${encodeURIComponent(query)}&limit=5`,
    token,
  })
}

// ── Health check ───────────────────────────────────────────────────────────────

export async function pingCore(): Promise<boolean> {
  try {
    await callCore({ path: '/api/health' })
    return true
  } catch {
    return false
  }
}
