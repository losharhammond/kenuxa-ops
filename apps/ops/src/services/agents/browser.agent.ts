/**
 * KENUXA OPS — Browser Agent (Phase 6)
 *
 * Two operating modes:
 *
 *  1. NAVIGATION MODE  (open_url / navigate / goto)
 *     Opens a REAL browser tab on the user's machine.
 *     Priority:
 *       a) Desktop Bridge (localhost:7411/execute open_url) — Electron agent
 *       b) Client-side fallback: returns { openUrl } so useExecution opens tab
 *
 *  2. AUTOMATION MODE  (search / extract / screenshot / click / fill_form)
 *     Delegates to external Playwright worker (headless, server-side).
 *     Worker URL set via PLAYWRIGHT_WORKER_URL env var.
 *     Falls back to AI simulation when worker is unavailable.
 *
 * Phase 6 rule: web navigation commands ALWAYS open the real browser.
 * No more simulated "navigate" responses for URL-open commands.
 */
import { dispatchToWorker, mapBrowserAction } from '@/services/worker/playwright.client'
import type { AgentTask, AgentResult } from '@/types/ops'
import { fastJSON } from '@/lib/groq/client'

const BRIDGE_HTTP_URL  = process.env.DESKTOP_BRIDGE_URL   ?? 'http://localhost:7411'
const BRIDGE_SECRET    = process.env.DESKTOP_BRIDGE_SECRET ?? ''

// Actions that should open a REAL browser tab (not scrape headlessly)
const NAVIGATION_ACTIONS = new Set([
  'open_url', 'browser_navigate', 'open_tab', 'goto', 'navigate',
  'browser_open', 'open_browser', 'go_to',
])

// ── Main entry point ───────────────────────────────────────────────────────────

export async function runBrowserAgent(task: AgentTask): Promise<AgentResult> {
  const start  = Date.now()
  const action = task.action.toLowerCase().replace(/-/g, '_')

  try {
    if (NAVIGATION_ACTIONS.has(action)) {
      return await handleNavigation(task, start)
    }

    return await handleAutomation(task, start)
  } catch (err) {
    return {
      agentType:  'browser',
      taskId:     task.id,
      success:    false,
      error:      (err as Error).message,
      durationMs: Date.now() - start,
    }
  }
}

// ── Navigation: open a real browser tab ───────────────────────────────────────

async function handleNavigation(task: AgentTask, start: number): Promise<AgentResult> {
  // Resolve URL from payload or extract from command text
  let url = (task.payload['url'] as string | undefined)
         ?? (task.payload['target'] as string | undefined)
         ?? (task.payload['href'] as string | undefined)
         ?? ''

  const rawText    = task.payload['rawText']    as string | undefined
  const searchQuery = task.payload['query']    as string | undefined
  const goal        = task.payload['goal']     as string | undefined

  // If no explicit URL, extract from goal text via Groq
  if (!url && (rawText || goal)) {
    url = await extractUrlFromText(rawText ?? goal ?? '')
  }

  if (!url) {
    return {
      agentType:  'browser',
      taskId:     task.id,
      success:    false,
      error:      'Could not extract a URL from the command. Try saying "go to google.com".',
      durationMs: Date.now() - start,
    }
  }

  url = normalizeUrl(url)

  // Append search query if present (e.g. "search for AI tools on google")
  if (searchQuery && (url.includes('google.com') || url.includes('bing.com') || url.includes('duckduckgo.com'))) {
    url = buildSearchUrl(url, searchQuery)
  }

  // ── Try Desktop Bridge first (opens tab in user's actual browser) ────────────
  const bridgeResult = await tryBridgeOpenUrl(url, task.userId)
  if (bridgeResult.success) {
    return {
      agentType:  'browser',
      taskId:     task.id,
      success:    true,
      output:     { opened: true, url, method: 'desktop_bridge' },
      durationMs: Date.now() - start,
      metadata:   { action: 'open_url', method: 'bridge' },
    }
  }

  // ── Fallback: signal client to open the tab ──────────────────────────────────
  // useExecution.ts watches for openUrl in plan_complete and calls window.open()
  return {
    agentType:  'browser',
    taskId:     task.id,
    success:    true,
    output:     {
      openUrl:  url,
      url,
      method:   'client_open',
      message:  `Opening ${url} in your browser…`,
    },
    durationMs: Date.now() - start,
    metadata:   { action: 'open_url', method: 'client' },
  }
}

// ── Automation: headless Playwright worker ────────────────────────────────────

async function handleAutomation(task: AgentTask, start: number): Promise<AgentResult> {
  const workerAction = mapBrowserAction(task.action)
  const input        = task.payload as Record<string, unknown>

  const response = await dispatchToWorker({
    action: workerAction,
    input,
    jobId:  task.id,
  })

  if (!response.success) {
    return {
      agentType:  'browser',
      taskId:     task.id,
      success:    false,
      error:      response.error ?? 'Browser worker returned failure',
      durationMs: Date.now() - start,
      metadata:   { action: workerAction },
    }
  }

  const result      = response.result as Record<string, unknown> | null
  const isSimulated = !!(result?.['simulated'])

  return {
    agentType:  'browser',
    taskId:     task.id,
    success:    true,
    output:     response.result,
    durationMs: response.durationMs ?? Date.now() - start,
    metadata:   { action: workerAction, simulated: isSimulated },
  }
}

// ── Bridge helper: call Electron agent directly ───────────────────────────────

async function tryBridgeOpenUrl(
  url:    string,
  userId: string,
): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${BRIDGE_HTTP_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(BRIDGE_SECRET ? { 'X-Bridge-Secret': BRIDGE_SECRET } : {}),
      },
      body:   JSON.stringify({ command: 'open_url', payload: { url }, userId }),
      signal: AbortSignal.timeout(4_000),
    })
    if (!res.ok) return { success: false }
    const data = await res.json() as { success?: boolean }
    return { success: data.success ?? false }
  } catch {
    return { success: false }
  }
}

// ── URL helpers ───────────────────────────────────────────────────────────────

function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `https://${trimmed}`
}

function buildSearchUrl(baseUrl: string, query: string): string {
  const encoded = encodeURIComponent(query)
  if (baseUrl.includes('google.com'))    return `https://www.google.com/search?q=${encoded}`
  if (baseUrl.includes('bing.com'))      return `https://www.bing.com/search?q=${encoded}`
  if (baseUrl.includes('duckduckgo'))    return `https://duckduckgo.com/?q=${encoded}`
  return baseUrl
}

// ── Use Groq to extract URL from natural language command ─────────────────────

async function extractUrlFromText(text: string): Promise<string> {
  // Fast path: regex for obvious URLs
  const urlMatch = text.match(
    /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.(?:com|org|io|net|co|app|so|gov|edu)(?:\/[^\s]*)?)/i
  )
  if (urlMatch?.[0]) return urlMatch[0]

  // Fast path: known service names
  const SERVICE_MAP: Record<string, string> = {
    google:     'https://www.google.com',
    youtube:    'https://www.youtube.com',
    gmail:      'https://mail.google.com',
    github:     'https://github.com',
    twitter:    'https://twitter.com',
    x:          'https://x.com',
    linkedin:   'https://linkedin.com',
    facebook:   'https://facebook.com',
    notion:     'https://notion.so',
    figma:      'https://figma.com',
    slack:      'https://slack.com',
    reddit:     'https://reddit.com',
    amazon:     'https://amazon.com',
    netflix:    'https://netflix.com',
    wikipedia:  'https://wikipedia.org',
    chatgpt:    'https://chat.openai.com',
    claude:     'https://claude.ai',
  }

  const lower = text.toLowerCase()
  for (const [keyword, url] of Object.entries(SERVICE_MAP)) {
    if (lower.includes(keyword)) return url
  }

  // Groq fallback: extract URL from natural language
  try {
    const result = await fastJSON<{ url: string | null; searchQuery?: string }>(
      'You are a URL extraction assistant.',
      `Extract the target website URL from this command: "${text.slice(0, 200)}"

If a search query is implied (e.g. "search for AI tools on google"), set searchQuery.
Return JSON: { "url": "https://...", "searchQuery": "optional search terms" }
If no URL can be extracted, set url to null.`,
      { temperature: 0.05 }
    )
    return result?.url ?? ''
  } catch {
    return ''
  }
}
