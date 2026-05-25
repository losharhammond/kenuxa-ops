/**
 * KENUXA Ecosystem Commands Handler
 * Routes commands to KENUXA CORE and REACH
 */
import { registerHandler } from '../router.service'
import type { ParsedIntent } from '@/types/ops'

const CORE_URL = process.env.NEXT_PUBLIC_KENUXA_CORE_URL ?? 'http://localhost:3000'

async function callCore(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${CORE_URL}${path}`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'X-Service-Key': process.env.KENUXA_CORE_API_KEY ?? '',
      'X-App':         'ops',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`CORE API error: ${res.status}`)
  return res.json()
}

registerHandler('query_reach', async (intent: ParsedIntent) => {
  const query = intent.entities['query'] as string
  try {
    const data = await callCore('/api/reach/query', { query, limit: 5 }) as { results?: unknown[] }
    const count = data.results?.length ?? 0
    return {
      result: data,
      speak:  count === 0
        ? `No intelligence found for "${query}".`
        : `Found ${count} intelligence result${count > 1 ? 's' : ''} for "${query}".`,
    }
  } catch {
    return {
      result: null,
      speak:  'Could not reach KENUXA REACH. Check your connection.',
    }
  }
})

registerHandler('get_intelligence', async (intent: ParsedIntent) => {
  const topic   = intent.entities['topic']   as string
  const country = intent.entities['country'] as string | undefined

  try {
    const data = await callCore('/api/myth/generate', {
      forecast_type: 'market_growth',
      context:       topic,
      country,
    }) as { data?: { title?: string; hypothesis?: string } }

    return {
      result: data,
      speak:  data?.data?.title
        ? `Market intelligence: ${data.data.title}.`
        : 'Intelligence query complete.',
    }
  } catch {
    return {
      result: null,
      speak:  'Could not generate intelligence. CORE may be unavailable.',
    }
  }
})

registerHandler('search_entities', async (intent: ParsedIntent) => {
  const query = intent.entities['query'] as string
  try {
    const data = await callCore('/api/graph/search', { query, limit: 5 }) as { data?: { nodes?: unknown[] } }
    const count = data?.data?.nodes?.length ?? 0
    return {
      result: data,
      speak:  `Found ${count} entit${count === 1 ? 'y' : 'ies'} for "${query}".`,
    }
  } catch {
    return {
      result: null,
      speak:  'Entity search unavailable.',
    }
  }
})
