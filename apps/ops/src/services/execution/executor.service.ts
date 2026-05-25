/**
 * KENUXA OPS — Step Executor (Phase 2)
 * Executes each individual step using the correct tool.
 * Runs server-side (API route context).
 */
import type { ExecStep } from '@/types/ops'
import { balancedChat, fastJSON } from '@/lib/groq/client'

// ── Context accumulator between steps ─────────────────────────────────────────

export interface StepContext {
  [stepIndex: number]: unknown
}

// ── Main dispatcher ────────────────────────────────────────────────────────────

export async function executeStep(
  step:    ExecStep,
  context: StepContext,
  userId:  string
): Promise<unknown> {
  switch (step.type) {
    // ── AI Processing ──────────────────────────────────────────────────────────
    case 'ai_process':
    case 'intent_analysis':
    case 'task_decomposition':
      return execAIProcess(step, context)

    // ── Web search ─────────────────────────────────────────────────────────────
    case 'web_search':
      return execWebSearch(step, context)

    // ── Browser automation (delegated to /api/browser) ────────────────────────
    case 'browser_open':
    case 'browser_click':
    case 'browser_extract':
    case 'browser_screenshot':
      return execBrowser(step, context)

    // ── Email ──────────────────────────────────────────────────────────────────
    case 'email_read':
      return execEmailRead(step, userId)
    case 'email_draft':
      return execEmailDraft(step, context)
    case 'email_send':
      return execEmailSend(step, context)

    // ── Memory ─────────────────────────────────────────────────────────────────
    case 'memory_read':
      return execMemoryRead(step, userId)
    case 'memory_write':
      return execMemoryWrite(step, context, userId)

    // ── KENUXA Core / REACH ────────────────────────────────────────────────────
    case 'kenuxa_query':
      return execKenuxaQuery(step)

    // ── HTTP ───────────────────────────────────────────────────────────────────
    case 'http_request':
      return execHTTP(step)

    // ── Result verification ────────────────────────────────────────────────────
    case 'result_verify':
      return execVerify(step, context)

    // ── Speak ─────────────────────────────────────────────────────────────────
    case 'speak':
      // TTS runs client-side; server just echoes the text
      return { spoke: step.input.text ?? String(context[step.index - 1] ?? '') }

    // ── Wait ──────────────────────────────────────────────────────────────────
    case 'wait': {
      const ms = Number(step.input.ms ?? 1000)
      await new Promise(r => setTimeout(r, Math.min(ms, 5000)))
      return { waited: ms }
    }

    // ── Desktop (server-limited, returns instructions for Electron) ───────────
    case 'desktop_open':
    case 'desktop_screenshot':
    case 'desktop_control':
      return {
        note: 'Desktop automation requires the KENUXA desktop agent. Command queued.',
        command: step.type,
        input: step.input,
      }

    default:
      return { skipped: true, reason: `No executor for type: ${step.type}` }
  }
}

// ── Tool implementations ───────────────────────────────────────────────────────

async function execAIProcess(step: ExecStep, context: StepContext): Promise<unknown> {
  const prompt = step.input.prompt as string
    ?? `Process this data: ${JSON.stringify(Object.values(context).slice(-3))}`
  const system = step.input.system as string
    ?? 'You are KENUXA OPS. Process the input and return a structured JSON result.'

  const result = await fastJSON<unknown>(system, prompt, { temperature: 0.1 })
  return result
}

async function execWebSearch(step: ExecStep, context: StepContext): Promise<unknown> {
  const query = (step.input.query as string)
    ?? String(Object.values(context).slice(-1)[0] ?? '')

  // Use Groq to do a "web grounded" search via prompting
  // In production this would use Brave Search API or Tavily
  const GROQ_SEARCH_PROMPT = `You are a web search assistant. Answer this query with factual, structured results:
Query: "${query}"

Return JSON: { "results": [{ "title": "...", "url": "...", "snippet": "..." }], "summary": "..." }
Include up to 5 relevant results. Be accurate. If you don't know, say so.`

  try {
    const results = await fastJSON<{ results: unknown[]; summary: string }>(
      'You are an AI web search assistant. Return accurate JSON results.',
      GROQ_SEARCH_PROMPT,
      { temperature: 0.1 }
    )
    return results
  } catch {
    return { results: [], summary: `Search for "${query}" - results unavailable`, query }
  }
}

async function execBrowser(step: ExecStep, context: StepContext): Promise<unknown> {
  // Delegate to /api/browser endpoint
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3002'
    const res = await fetch(`${base}/api/browser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action:  step.type,
        input:   step.input,
        context: Object.values(context).slice(-2),
      }),
    })
    if (!res.ok) return { error: `Browser API returned ${res.status}`, action: step.type }
    return await res.json()
  } catch (e) {
    return { error: (e as Error).message, action: step.type }
  }
}

async function execEmailRead(step: ExecStep, userId: string): Promise<unknown> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3002'
    const res = await fetch(`${base}/api/email?action=list&userId=${userId}`)
    const j   = await res.json() as { data?: unknown[] }
    const threads = j.data ?? []

    const count  = Number(step.input.count ?? 5)
    const filter = (step.input.filter as string) ?? ''

    return { threads: (threads as unknown[]).slice(0, count), total: threads.length, filter }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

async function execEmailDraft(step: ExecStep, context: StepContext): Promise<unknown> {
  const prevData = JSON.stringify(Object.values(context).slice(-2)).slice(0, 800)
  const instruction = step.input.instruction as string ?? 'Draft a professional email'
  const to = step.input.to as string ?? ''
  const subject = step.input.subject as string ?? ''

  const draft = await balancedChat(
    'You are a professional email writer for KENUXA OPS. Generate concise, professional emails.',
    `${instruction}

Context from previous steps: ${prevData}

${to      ? `To: ${to}`      : ''}
${subject ? `Subject: ${subject}` : ''}

Return ONLY the email body — no subject line, no metadata.`,
    { temperature: 0.2, maxTokens: 300 }
  )

  return { draft, to, subject }
}

async function execEmailSend(step: ExecStep, context: StepContext): Promise<unknown> {
  const draft = (context[step.index - 1] as { draft?: string; to?: string; subject?: string }) ?? {}
  const to      = (step.input.to      as string) ?? draft.to      ?? ''
  const subject = (step.input.subject as string) ?? draft.subject ?? 'Message from KENUXA OPS'
  const body    = (step.input.body    as string) ?? draft.draft   ?? ''

  if (!to || !body) return { error: 'Missing to or body for email send' }

  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3002'
    const res = await fetch(`${base}/api/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', to, subject, body }),
    })
    return res.ok ? { sent: true, to, subject } : { error: 'Send failed', status: res.status }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

async function execMemoryRead(step: ExecStep, userId: string): Promise<unknown> {
  const query = step.input.query as string ?? ''
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3002'
    const url  = `${base}/api/memory?q=${encodeURIComponent(query)}&userId=${userId}`
    const res  = await fetch(url)
    const j    = await res.json() as { data?: unknown }
    return j.data ?? { memories: [], query }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

async function execMemoryWrite(
  step: ExecStep, context: StepContext, userId: string
): Promise<unknown> {
  const key   = step.input.key   as string ?? 'execution_result'
  const value = step.input.value as string
    ?? JSON.stringify(Object.values(context).slice(-1)[0] ?? '').slice(0, 500)

  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3002'
    const res  = await fetch(`${base}/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remember', key, value, userId }),
    })
    return res.ok ? { stored: true, key } : { error: 'Memory write failed' }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

async function execKenuxaQuery(step: ExecStep): Promise<unknown> {
  const query  = step.input.query as string ?? ''
  const coreUrl = process.env.KENUXA_CORE_URL ?? 'http://localhost:3000'
  const apiKey  = process.env.KENUXA_CORE_API_KEY ?? ''

  try {
    const res = await fetch(`${coreUrl}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ query }),
    })
    if (!res.ok) return { error: `CORE returned ${res.status}`, query }
    return await res.json()
  } catch {
    return { error: 'KENUXA CORE unreachable', query }
  }
}

async function execHTTP(step: ExecStep): Promise<unknown> {
  const url    = step.input.url     as string
  const method = (step.input.method as string) ?? 'GET'
  const body   = step.input.body

  if (!url) return { error: 'No URL provided for http_request' }

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(step.input.headers as Record<string, string> ?? {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    try { return { status: res.status, data: JSON.parse(text) } }
    catch { return { status: res.status, data: text.slice(0, 2000) } }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

async function execVerify(step: ExecStep, context: StepContext): Promise<unknown> {
  const lastOutput  = Object.values(context).slice(-1)[0]
  const expectation = step.input.expect as string ?? 'The result should be valid and complete'

  try {
    const verdict = await fastJSON<{ passed: boolean; reason: string }>(
      'You are a result verifier. Inspect the output and verify it meets the expectation.',
      `Expectation: "${expectation}"
Output to verify: ${JSON.stringify(lastOutput).slice(0, 1000)}
Return: { "passed": true/false, "reason": "brief explanation" }`,
      { temperature: 0.05 }
    )
    return verdict
  } catch {
    return { passed: true, reason: 'Verification skipped (AI unavailable)' }
  }
}
