/**
 * KENUXA OPS — Command Router
 * Mirrors the Python router.py pattern: speak feedback, then execute
 */
import { parseIntent, generateResponse } from '@/services/ai/brain.service'
import { speak }                         from '@/services/voice/tts.service'
import type { ParsedIntent, OpsCommand, CommandIntent } from '@/types/ops'

// ── Handler registry ───────────────────────────────────────────────────────────

type HandlerFn = (intent: ParsedIntent) => Promise<{ result: unknown; speak?: string }>

const handlers: Partial<Record<CommandIntent, HandlerFn>> = {}

export function registerHandler(intent: CommandIntent, fn: HandlerFn): void {
  handlers[intent] = fn
}

// ── Pending confirmation state ─────────────────────────────────────────────────

let pendingConfirmation: { intent: ParsedIntent; resolve: (confirm: boolean) => void } | null = null

export function confirmPending(confirmed: boolean): void {
  pendingConfirmation?.resolve(confirmed)
  pendingConfirmation = null
}

// ── Main route function ────────────────────────────────────────────────────────

export async function routeCommand(rawText: string): Promise<OpsCommand> {
  const startTime = Date.now()
  const command: Partial<OpsCommand> = {
    rawText,
    source:    'voice',
    status:    'pending',
    createdAt: new Date().toISOString(),
  }

  try {
    // 1. Parse intent
    const intent = await parseIntent(rawText)
    command.intent     = intent.intent
    command.confidence = intent.confidence
    command.entities   = intent.entities

    // 2. Immediate voice feedback
    if (intent.speak_text) {
      speak(intent.speak_text, 'normal')
      command.speakText = intent.speak_text
    }

    // 3. Handle confirmation if needed
    if (intent.needs_confirm) {
      const confirmed = await requestConfirmation(intent)
      if (!confirmed) {
        speak('Cancelled.', 'normal')
        command.status = 'cancelled'
        return command as OpsCommand
      }
    }

    // 4. Execute handler
    command.status = 'executing'
    const handler = handlers[intent.intent]

    if (!handler) {
      // Unknown or unregistered — call API endpoint
      const res = await fetch('/api/commands', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rawText, intent }),
      })
      const json = await res.json() as { result?: unknown; speak?: string; error?: string }

      if (!res.ok || json.error) throw new Error(json.error ?? 'Command failed')

      command.result  = json.result
      command.status  = 'completed'
      command.handler = 'api'

      if (json.speak) speak(json.speak, 'normal')
    } else {
      const { result, speak: speakResponse } = await handler(intent)
      command.result  = result
      command.status  = 'completed'
      command.handler = intent.intent

      if (speakResponse) {
        speak(speakResponse, 'normal')
        command.speakText = speakResponse
      } else {
        // Generate natural response
        const auto = await generateResponse(intent.intent, result, rawText)
        if (auto) speak(auto, 'normal')
      }
    }
  } catch (err) {
    command.status = 'failed'
    command.error  = (err as Error).message
    speak(`Sorry, that failed. ${command.error?.slice(0, 60) ?? ''}`, 'high')
  }

  command.executionMs = Date.now() - startTime

  // Persist command asynchronously
  fetch('/api/commands', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action: 'log', command }),
  }).catch(() => {})

  return command as OpsCommand
}

function requestConfirmation(intent: ParsedIntent): Promise<boolean> {
  return new Promise((resolve) => {
    pendingConfirmation = { intent, resolve }
    // Auto-reject after 10s
    setTimeout(() => {
      if (pendingConfirmation) {
        pendingConfirmation.resolve(false)
        pendingConfirmation = null
        speak('Confirmation timed out.', 'normal')
      }
    }, 10_000)
  })
}
