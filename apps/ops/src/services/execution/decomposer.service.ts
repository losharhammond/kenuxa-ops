/**
 * KENUXA OPS — Task Decomposer (Phase 2)
 * Breaks a complex natural-language goal into atomic execution steps
 * using Groq for fast structured output.
 */
import { fastJSON }        from '@/lib/groq/client'
import type { ExecStep, ExecStepType } from '@/types/ops'
import { nanoid }          from 'nanoid'

// ── Tool catalogue shown to the AI ────────────────────────────────────────────

const TOOL_CATALOGUE = `
Available tools and their step types:
- web_search      : Search the internet (tool: "brave_search" or "groq_browse")
- browser_open    : Open a URL in headless browser (tool: "playwright")
- browser_click   : Click an element on a page (tool: "playwright")
- browser_extract : Extract structured data from page (tool: "playwright")
- browser_screenshot: Capture a screenshot (tool: "playwright")
- email_read      : Read emails from inbox (tool: "gmail")
- email_send      : Send an email (tool: "gmail")
- email_draft     : Draft / generate email text (tool: "groq")
- desktop_open    : Open an application (tool: "desktop")
- desktop_screenshot: Take a desktop screenshot (tool: "desktop")
- memory_read     : Read from memory store (tool: "memory")
- memory_write    : Write to memory store (tool: "memory")
- ai_process      : Process / summarize / analyse data with AI (tool: "groq")
- workflow_run    : Run a saved workflow (tool: "workflow_engine")
- http_request    : Make an HTTP API call (tool: "fetch")
- kenuxa_query    : Query KENUXA CORE / REACH intelligence (tool: "kenuxa_core")
- speak           : Speak a result aloud (tool: "tts")
- result_verify   : Verify previous step output is correct (tool: "groq")
- wait            : Wait for a duration or condition (tool: "timer")
`

const SYSTEM = `You are the task decomposer for KENUXA OPS — an AI operations execution engine.
Your job: decompose a complex goal into the minimum required atomic execution steps.

${TOOL_CATALOGUE}

Rules:
1. Only include steps that are genuinely needed
2. Order steps so each depends on the previous output if needed
3. Never hallucinate — if a step requires data from a previous step, mark it clearly in input
4. Max 10 steps per plan
5. Respond ONLY with valid JSON — no markdown, no explanation

Response format (array of steps):
[
  {
    "type": "step_type_from_catalogue",
    "label": "Short human label (max 8 words)",
    "tool": "tool_name",
    "input": { "key": "value" }
  }
]`

// ── Public API ─────────────────────────────────────────────────────────────────

export interface DecomposedStep {
  type:  ExecStepType
  label: string
  tool:  string
  input: Record<string, unknown>
}

/** Ask Groq to break a goal into atomic steps */
export async function decomposeGoal(goal: string): Promise<ExecStep[]> {
  const raw = await fastJSON<DecomposedStep[]>(
    SYSTEM,
    `Decompose this goal into execution steps: "${goal}"`,
    { temperature: 0.05 }
  )

  const steps = Array.isArray(raw) ? raw : []

  // Hydrate with runtime fields
  return steps.map((s, i): ExecStep => ({
    id:     nanoid(8),
    index:  i,
    type:   s.type   ?? 'ai_process',
    label:  s.label  ?? `Step ${i + 1}`,
    tool:   s.tool   ?? 'groq',
    input:  s.input  ?? {},
    status: 'pending',
  }))
}
