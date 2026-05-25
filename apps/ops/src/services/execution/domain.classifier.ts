/**
 * KENUXA OPS — Execution Domain Classifier (Phase 5.2)
 *
 * Classifies a voice command into one of 6 execution domains:
 *   browser      → web navigation, search, scrape
 *   email        → Outlook / send / read / draft
 *   desktop      → open apps, switch windows (requires bridge)
 *   file         → open files, navigate filesystem (requires bridge)
 *   workflow     → run saved workflow
 *   conversation → memory, AI chat, general queries
 *
 * Priority: pattern matching first (fast, free) → Groq fallback (accurate)
 */
import type { ExecutionDomain } from '@/types/ops'

// ── Pattern tables ─────────────────────────────────────────────────────────────

const DOMAIN_PATTERNS: Array<{ domain: ExecutionDomain; patterns: RegExp[] }> = [
  {
    domain: 'browser',
    patterns: [
      /\b(visit|go to|open|navigate to|browse to)\b.*(\.com|\.org|\.io|\.net|website|site|page|url)/i,
      /\b(search (the web|google|online) for|look up online|web search)\b/i,
      /\b(scrape|extract from|get data from|screenshot of)\b.*(http|www|\.com)/i,
      /\b(tally\.so|tally\.com|google\.com|notion\.so|figma\.com)\b/i,
      /\bopen.*(chrome|browser|firefox|edge|safari)\b/i,
    ],
  },
  {
    domain: 'email',
    patterns: [
      /\b(send|draft|write|compose)\b.*(email|mail|message)\b/i,
      /\b(email|message|mail)\b.*(to|@)\b/i,
      /\b(inbox|unread|emails?|messages?)\b.*(check|read|summarize|show)\b/i,
      /\b(check|read|summarize|show)\b.*(inbox|emails?|messages?)\b/i,
      /\b(reply|respond|forward)\b.*(email|message|mail)\b/i,
      /@\w+\.\w+/,   // email address detected
    ],
  },
  {
    domain: 'desktop',
    patterns: [
      /\b(open|launch|start|run)\b.*(app(lication)?|program|software|excel|word|powerpoint|notepad|calculator)\b/i,
      /\b(switch to|focus on|bring up|activate)\b.*(window|app|application)\b/i,
      /\b(open|launch)\b.*(file explorer|finder|terminal|cmd|command prompt|task manager)\b/i,
      /\b(minimize|maximize|close)\b.*(window|app)\b/i,
      /\bopen (microsoft|ms)\b/i,
    ],
  },
  {
    domain: 'file',
    patterns: [
      /\b(open|go to|navigate to|show|find)\b.*(documents?|downloads?|desktop|pictures?|music|videos?|folder)\b/i,
      /\b(open|find|search for|look for)\b.*\.(pdf|docx?|xlsx?|pptx?|txt|csv|png|jpg)\b/i,
      /\b(read|view|edit)\b.*(file|document|spreadsheet|presentation|pdf)\b/i,
      /\b(move|copy|delete|rename)\b.*(file|folder|document)\b/i,
    ],
  },
  {
    domain: 'workflow',
    patterns: [
      /\b(run|start|trigger|execute|activate)\b.*(workflow|automation|routine|schedule|job)\b/i,
      /\b(morning briefing|daily report|weekly summary|status update)\b/i,
      /\b(automate|automated)\b/i,
    ],
  },
]

// ── Fast classifier ────────────────────────────────────────────────────────────

export function classifyDomainFast(text: string): ExecutionDomain | null {
  for (const { domain, patterns } of DOMAIN_PATTERNS) {
    if (patterns.some(p => p.test(text))) {
      return domain
    }
  }
  return null
}

// ── Full classifier (with Groq fallback) ──────────────────────────────────────

export async function classifyDomain(text: string): Promise<ExecutionDomain> {
  // Fast path: pattern matching (no API call)
  const fast = classifyDomainFast(text)
  if (fast) return fast

  // Slow path: Groq classification for ambiguous commands
  try {
    const { fastJSON } = await import('@/lib/groq/client')
    const result = await fastJSON<{ domain: ExecutionDomain; confidence: number }>(
      'You are a command classifier for an AI execution system.',
      `Classify this voice command into exactly ONE execution domain:
"${text.slice(0, 200)}"

Domains:
- browser: web navigation, search, scrape websites
- email: send/read/draft Outlook emails
- desktop: open apps, switch windows (needs local bridge)
- file: open/search files and folders (needs local bridge)
- workflow: run saved automation workflows
- conversation: memory queries, AI chat, general

Return JSON: { "domain": "browser|email|desktop|file|workflow|conversation", "confidence": 0.0-1.0 }`,
      { temperature: 0.05 }
    )
    return result?.domain ?? 'conversation'
  } catch {
    return 'conversation'
  }
}

// ── Domain metadata ────────────────────────────────────────────────────────────

export const DOMAIN_META: Record<ExecutionDomain, {
  label:      string
  icon:       string
  requiresBridge: boolean
  status:     string
}> = {
  browser:      { label: 'Browser',      icon: '🌐', requiresBridge: false, status: 'browser_active'  },
  email:        { label: 'Email',        icon: '📧', requiresBridge: false, status: 'email_sending'   },
  desktop:      { label: 'Desktop',      icon: '🖥',  requiresBridge: true,  status: 'desktop_active'  },
  file:         { label: 'File System',  icon: '📁', requiresBridge: true,  status: 'file_opening'    },
  workflow:     { label: 'Workflow',     icon: '⚡', requiresBridge: false, status: 'executing'       },
  conversation: { label: 'Conversation', icon: '🧠', requiresBridge: false, status: 'processing'      },
}

// ── Extract entities from command ─────────────────────────────────────────────

export function extractEntities(text: string): Record<string, string> {
  const entities: Record<string, string> = {}

  // Email address
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i)
  if (emailMatch) entities['lastEmail'] = emailMatch[0]

  // URL / domain
  const urlMatch = text.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.(?:com|org|io|net|co|app|so)(?:\/\S*)?)/i)
  if (urlMatch) entities['lastUrl'] = urlMatch[0]

  // File extension
  const fileMatch = text.match(/[\w\s-]+\.(?:pdf|docx?|xlsx?|pptx?|txt|csv)/i)
  if (fileMatch) entities['lastFile'] = fileMatch[0].trim()

  // App name (simple heuristic — words following "open")
  const appMatch = text.match(/\bopen\s+([A-Za-z][A-Za-z0-9\s]{1,20}?)(?:\s+app)?\b/i)
  if (appMatch?.[1] && !appMatch[1].toLowerCase().includes('email')) {
    entities['lastApp'] = appMatch[1].trim()
  }

  return entities
}
