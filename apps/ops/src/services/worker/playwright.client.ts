/**
 * KENUXA OPS — External Playwright Worker Client (Phase 3)
 *
 * Phase 3 rule: OPS does NOT run Playwright locally on Vercel.
 * All browser automation is delegated to an external worker service
 * running on Railway / Render / Fly.io free tier.
 *
 * Worker API contract:
 *   POST {PLAYWRIGHT_WORKER_URL}/execute
 *   Headers: X-Worker-Secret: {PLAYWRIGHT_WORKER_SECRET}
 *   Body:    { action, input, jobId }
 *   Returns: { success, result, error }
 */

const WORKER_URL    = process.env.PLAYWRIGHT_WORKER_URL    ?? ''
const WORKER_SECRET = process.env.PLAYWRIGHT_WORKER_SECRET ?? ''
const WORKER_TIMEOUT_MS = 25_000

export type WorkerAction =
  | 'navigate'
  | 'extract'
  | 'click'
  | 'screenshot'
  | 'search'
  | 'fill_form'

export interface WorkerRequest {
  action:  WorkerAction
  input:   Record<string, unknown>
  jobId?:  string
}

export interface WorkerResponse {
  success: boolean
  result?: unknown
  error?:  string
  durationMs?: number
}

// ── Main dispatch function ─────────────────────────────────────────────────────

export async function dispatchToWorker(req: WorkerRequest): Promise<WorkerResponse> {
  // 1. Worker not configured → fallback to AI simulation
  if (!WORKER_URL) {
    return simulateWorkerResponse(req)
  }

  try {
    const res = await fetch(`${WORKER_URL}/execute`, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-Worker-Secret': WORKER_SECRET,
        'X-App':           'kenuxa-ops',
      },
      body:   JSON.stringify(req),
      signal: AbortSignal.timeout(WORKER_TIMEOUT_MS),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      return {
        success: false,
        error:   `Worker returned HTTP ${res.status}: ${errText.slice(0, 200)}`,
      }
    }

    const data = await res.json() as WorkerResponse
    return data
  } catch (err) {
    const msg = (err as Error).message
    console.error('[playwright-client] Worker error:', msg)

    // If worker is unreachable, fallback to AI simulation
    if (msg.includes('fetch') || msg.includes('ECONNREFUSED') || msg.includes('timeout')) {
      console.warn('[playwright-client] Worker unreachable — using AI simulation fallback')
      return simulateWorkerResponse(req)
    }

    return { success: false, error: msg }
  }
}

// ── Map from Phase 2 browser action names to worker action names ───────────────

export function mapBrowserAction(
  stepType: string
): WorkerAction {
  const mapping: Record<string, WorkerAction> = {
    browser_open:       'navigate',
    browser_click:      'click',
    browser_extract:    'extract',
    browser_screenshot: 'screenshot',
    search:             'search',
    navigate:           'navigate',
  }
  return mapping[stepType] ?? 'navigate'
}

// ── Simulate worker response using Groq (when worker unavailable) ──────────────

async function simulateWorkerResponse(req: WorkerRequest): Promise<WorkerResponse> {
  const start = Date.now()

  try {
    const { fastJSON } = await import('@/lib/groq/client')

    let prompt = ''
    switch (req.action) {
      case 'search':
        prompt = `Simulate a web search for: "${req.input['query'] ?? ''}"
Return JSON: { "results": [{ "title": "...", "url": "...", "snippet": "..." }], "summary": "..." }
Provide 5 plausible but clearly simulated results.`
        break

      case 'extract':
        prompt = `Simulate extracting content from URL: "${req.input['url'] ?? ''}"
Return JSON: { "title": "...", "text": "...", "items": [] }
Note this is a simulated response (Playwright worker not configured).`
        break

      case 'navigate':
        return {
          success:    true,
          result:     { url: req.input['url'], title: 'Simulated page', loaded: true, simulated: true },
          durationMs: Date.now() - start,
        }

      case 'screenshot':
        return {
          success:    true,
          result:     { url: req.input['url'], screenshot: null, note: 'Playwright worker not configured' },
          durationMs: Date.now() - start,
        }

      default:
        return {
          success:    false,
          error:      `Worker not configured. Set PLAYWRIGHT_WORKER_URL to enable browser automation.`,
          durationMs: Date.now() - start,
        }
    }

    const result = await fastJSON<unknown>(
      'You are a web browser simulation engine. Generate realistic simulated browser results.',
      prompt,
      { temperature: 0.1 }
    )

    return {
      success:    true,
      result:     { ...((result as Record<string, unknown>) ?? {}), simulated: true },
      durationMs: Date.now() - start,
    }
  } catch (err) {
    return { success: false, error: (err as Error).message, durationMs: Date.now() - start }
  }
}

// ── Health check for the worker ────────────────────────────────────────────────

export async function checkWorkerHealth(): Promise<{ online: boolean; latencyMs?: number }> {
  if (!WORKER_URL) return { online: false }

  const start = Date.now()
  try {
    const res = await fetch(`${WORKER_URL}/health`, {
      headers: { 'X-Worker-Secret': WORKER_SECRET },
      signal:  AbortSignal.timeout(5000),
    })
    return { online: res.ok, latencyMs: Date.now() - start }
  } catch {
    return { online: false, latencyMs: Date.now() - start }
  }
}
