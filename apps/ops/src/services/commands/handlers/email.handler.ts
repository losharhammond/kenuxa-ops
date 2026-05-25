/**
 * Email Commands Handler
 */
import { registerHandler } from '../router.service'
import type { ParsedIntent } from '@/types/ops'

async function emailApi(action: string, body: Record<string, unknown>) {
  const res = await fetch('/api/email', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action, ...body }),
  })
  const json = await res.json() as { data?: unknown; error?: string }
  if (!res.ok || json.error) throw new Error(json.error ?? 'Email operation failed')
  return json.data
}

registerHandler('send_email', async (intent: ParsedIntent) => {
  const to      = intent.entities['to']      as string
  const subject = intent.entities['subject'] as string
  const body    = intent.entities['body']    as string

  if (!to) return { result: null, speak: 'Who should I send the email to?' }

  const data = await emailApi('send', { to, subject, body })
  return {
    result: data,
    speak:  `Email sent to ${to}.`,
  }
})

registerHandler('read_emails', async (intent: ParsedIntent) => {
  const count  = Number(intent.entities['count']  ?? 5)
  const filter = intent.entities['filter'] as string | undefined

  const data = await emailApi('read', { count, filter }) as { emails?: unknown[]; summary?: string }

  const emails = data?.emails ?? []
  const speak  = emails.length === 0
    ? 'Your inbox is clear.'
    : data?.summary ?? `You have ${emails.length} unread email${emails.length > 1 ? 's' : ''}.`

  return { result: data, speak }
})

registerHandler('summarize_inbox', async () => {
  const data = await emailApi('summarize', {}) as { summary?: string }
  return {
    result: data,
    speak:  data?.summary ?? 'Your inbox is summarized.',
  }
})

registerHandler('search_emails', async (intent: ParsedIntent) => {
  const query = intent.entities['query'] as string
  const data  = await emailApi('search', { query }) as { count?: number }
  return {
    result: data,
    speak:  `Found ${data?.count ?? 0} emails matching "${query}".`,
  }
})

registerHandler('draft_reply', async (intent: ParsedIntent) => {
  const instruction = intent.entities['instruction'] as string
  const threadId    = intent.entities['thread_id']   as string | undefined

  const data = await emailApi('draft_reply', { instruction, thread_id: threadId }) as { draft?: string }
  return {
    result: data,
    speak:  'Reply drafted. Check your email hub to review and send.',
  }
})
