/**
 * KENUXA Ecosystem Workers
 * BullMQ-powered background job processors
 *
 * Queues:
 *   kenuxa:ai      — async AI jobs (classification, analysis)
 *   kenuxa:crawl   — web crawling and extraction
 *   kenuxa:events  — event processing and webhook delivery
 *   kenuxa:email   — email delivery
 *   kenuxa:wallet  — async wallet operations
 */

import { Worker, Queue } from 'bullmq'

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379'
const connection = { url: REDIS_URL }

// ─── Queue definitions ────────────────────────────────────────

export const queues = {
  ai:     new Queue('kenuxa:ai',     { connection }),
  crawl:  new Queue('kenuxa:crawl',  { connection }),
  events: new Queue('kenuxa:events', { connection }),
  email:  new Queue('kenuxa:email',  { connection }),
  wallet: new Queue('kenuxa:wallet', { connection }),
}

// ─── AI Worker ────────────────────────────────────────────────

const aiWorker = new Worker('kenuxa:ai', async job => {
  const { app, organizationId, task, prompt, tier } = job.data as {
    app: string; organizationId: string; task: string; prompt: string; tier: string
  }

  console.log(`[AI Worker] Processing: ${task} for org ${organizationId}`)

  const res = await fetch(`${process.env['KENUXA_CORE_URL']}/api/ai`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'X-Service-Key': process.env['KENUXA_CORE_API_KEY'] ?? '',
    },
    body: JSON.stringify({ app, organizationId, task, prompt, tier }),
  })

  if (!res.ok) throw new Error(`AI request failed: ${await res.text()}`)
  return res.json()
}, { connection, concurrency: 5 })

// ─── Crawl Worker ─────────────────────────────────────────────

const crawlWorker = new Worker('kenuxa:crawl', async job => {
  const { url, orgId, crawlerId } = job.data as {
    url: string; orgId: string; crawlerId: string
  }

  console.log(`[Crawl Worker] Processing: ${url}`)
  // TODO: implement crawling logic
  // 1. Fetch URL (respecting robots.txt)
  // 2. Extract entities using Core AI
  // 3. Store in REACH Supabase
  // 4. Update crawler stats
  // 5. Emit reach.entity.extracted event

  return { url, status: 'queued' }
}, { connection, concurrency: 3 })

// ─── Event Worker ─────────────────────────────────────────────

const eventWorker = new Worker('kenuxa:events', async job => {
  const { eventId, subscriptionId, webhookUrl, payload } = job.data as {
    eventId: string; subscriptionId: string; webhookUrl: string; payload: Record<string, unknown>
  }

  console.log(`[Event Worker] Delivering event ${eventId} to ${webhookUrl}`)

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) throw new Error(`Webhook delivery failed: ${res.status}`)
  return { delivered: true, status: res.status }
}, { connection, concurrency: 10 })

// ─── Graceful shutdown ────────────────────────────────────────

async function shutdown() {
  console.log('Shutting down workers...')
  await Promise.all([
    aiWorker.close(),
    crawlWorker.close(),
    eventWorker.close(),
  ])
  await Promise.all(Object.values(queues).map(q => q.close()))
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT',  shutdown)

console.log('KENUXA Workers started. Listening on queues: ai, crawl, events, email, wallet')
