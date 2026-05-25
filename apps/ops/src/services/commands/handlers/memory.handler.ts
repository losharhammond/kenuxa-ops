/**
 * Memory Commands Handler
 */
import { registerHandler } from '../router.service'
import type { ParsedIntent } from '@/types/ops'

async function memApi(action: string, body: Record<string, unknown>) {
  const res = await fetch('/api/memory', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action, ...body }),
  })
  const json = await res.json() as { data?: unknown; error?: string }
  if (!res.ok || json.error) throw new Error(json.error ?? 'Memory error')
  return json.data
}

registerHandler('remember', async (intent: ParsedIntent) => {
  const key   = intent.entities['key']   as string | undefined
  const value = intent.entities['value'] as string
  if (!value) return { result: null, speak: "What should I remember?" }

  await memApi('save', { type: 'fact', key, value })
  return { result: { saved: true }, speak: `Got it. I'll remember that.` }
})

registerHandler('recall', async (intent: ParsedIntent) => {
  const query = (intent.entities['query'] ?? intent.entities['key']) as string
  const data  = await memApi('search', { query }) as { entries?: Array<{ value: string }> }
  const items = data?.entries ?? []

  if (items.length === 0) return { result: null, speak: `I don't have anything about "${query}" in memory.` }

  const top = items[0]?.value ?? ''
  return {
    result: data,
    speak:  items.length === 1
      ? `Here's what I remember: ${top}`
      : `I found ${items.length} memory entries. The most relevant: ${top}`,
  }
})

registerHandler('create_task', async (intent: ParsedIntent) => {
  const title    = intent.entities['title']    as string
  const priority = (intent.entities['priority'] as string) ?? 'medium'
  if (!title) return { result: null, speak: 'What task should I create?' }

  const res  = await fetch('/api/memory', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action: 'create_task', title, priority }),
  })
  const json = await res.json() as { data?: unknown }
  return { result: json.data, speak: `Task created: ${title}.` }
})
