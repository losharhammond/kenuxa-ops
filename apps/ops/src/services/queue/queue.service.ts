/**
 * KENUXA OPS — Queue Service (Phase 3)
 * Manages the Upstash Redis job queue:
 *  - enqueue / dequeue
 *  - retry logic with exponential backoff
 *  - dead-letter queue
 *  - stats
 */
import { nanoid }        from 'nanoid'
import { getRedis, QUEUE_KEYS } from '@/lib/queue/redis'
import type { QueueJob, JobType, QueueStats } from '@/types/ops'

// ── Retry policy ───────────────────────────────────────────────────────────────

const MAX_RETRIES = 3
const BACKOFF_MS  = [30_000, 60_000, 120_000]  // 30s, 1m, 2m

export function retryDelayMs(attempt: number): number {
  return BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)] ?? 120_000
}

// ── Enqueue a new job ──────────────────────────────────────────────────────────

export async function enqueue(
  type:     JobType,
  payload:  Record<string, unknown>,
  userId:   string,
  opts?: {
    orgId?:       string
    maxRetries?:  number
    scheduledAt?: string   // defer to future time (ISO)
  }
): Promise<QueueJob> {
  const redis = getRedis()
  const job: QueueJob = {
    id:          nanoid(16),
    type,
    payload,
    userId,
    orgId:       opts?.orgId,
    status:      'queued',
    retries:     0,
    maxRetries:  opts?.maxRetries ?? MAX_RETRIES,
    createdAt:   new Date().toISOString(),
    scheduledAt: opts?.scheduledAt ?? new Date().toISOString(),
  }

  // Store full job detail
  await redis.set(QUEUE_KEYS.jobPrefix(job.id), JSON.stringify(job))

  // Push job ID to pending list
  await redis.lpush(QUEUE_KEYS.pending, job.id)

  // Increment queued stat
  await redis.hincrby(QUEUE_KEYS.stats, 'queued', 1)
  await redis.hincrby(QUEUE_KEYS.stats, 'total_enqueued', 1)

  console.info(`[queue] enqueued job ${job.id} (${type})`)
  return job
}

// ── Dequeue the next due job ───────────────────────────────────────────────────

export async function dequeue(): Promise<QueueJob | null> {
  const redis = getRedis()

  const jobId = await redis.rpop(QUEUE_KEYS.pending) as string | null
  if (!jobId) return null

  const jobJson = await redis.get(QUEUE_KEYS.jobPrefix(jobId)) as string | null
  if (!jobJson) return null

  let job: QueueJob
  try { job = JSON.parse(jobJson) as QueueJob }
  catch { return null }

  // Check if scheduled time has arrived
  if (job.scheduledAt && new Date(job.scheduledAt) > new Date()) {
    // Re-queue — not ready yet
    await redis.lpush(QUEUE_KEYS.pending, jobId)
    return null
  }

  // Mark as processing
  job.status      = 'processing'
  job.processedAt = new Date().toISOString()

  await redis.set(QUEUE_KEYS.jobPrefix(job.id), JSON.stringify(job))
  await redis.hset(QUEUE_KEYS.processing, { [job.id]: new Date().toISOString() })
  await redis.hincrby(QUEUE_KEYS.stats, 'queued',     -1)
  await redis.hincrby(QUEUE_KEYS.stats, 'processing',  1)

  return job
}

// ── Mark job completed ─────────────────────────────────────────────────────────

export async function completeJob(job: QueueJob, result: unknown): Promise<void> {
  const redis = getRedis()

  const updated: QueueJob = {
    ...job,
    status:      'completed',
    result,
    completedAt: new Date().toISOString(),
  }

  await redis.set(QUEUE_KEYS.jobPrefix(job.id), JSON.stringify(updated))

  // Remove from processing map
  const processing = await redis.hgetall(QUEUE_KEYS.processing) as Record<string, string> | null
  if (processing && processing[job.id]) {
    const newProcessing = { ...processing }
    delete newProcessing[job.id]
    await redis.del(QUEUE_KEYS.processing)
    if (Object.keys(newProcessing).length > 0) {
      await redis.hset(QUEUE_KEYS.processing, newProcessing)
    }
  }

  await redis.hincrby(QUEUE_KEYS.stats, 'processing', -1)
  await redis.hincrby(QUEUE_KEYS.stats, 'completed',   1)

  console.info(`[queue] completed job ${job.id}`)
}

// ── Mark job failed — retry or dead-letter ────────────────────────────────────

export async function failJob(job: QueueJob, error: string): Promise<void> {
  const redis = getRedis()

  const nextRetry = job.retries + 1

  if (nextRetry <= job.maxRetries) {
    // Re-queue with backoff
    const delayMs = retryDelayMs(nextRetry)
    const updated: QueueJob = {
      ...job,
      status:      'retrying',
      retries:     nextRetry,
      error,
      scheduledAt: new Date(Date.now() + delayMs).toISOString(),
    }

    await redis.set(QUEUE_KEYS.jobPrefix(job.id), JSON.stringify(updated))
    await redis.lpush(QUEUE_KEYS.pending, job.id)

    console.warn(`[queue] retrying job ${job.id} (attempt ${nextRetry}/${job.maxRetries}) in ${delayMs / 1000}s`)
  } else {
    // Dead-letter — no more retries
    const updated: QueueJob = {
      ...job,
      status:      'dead',
      error,
      completedAt: new Date().toISOString(),
    }

    await redis.set(QUEUE_KEYS.jobPrefix(job.id), JSON.stringify(updated))
    await redis.lpush(QUEUE_KEYS.dead, job.id)
    await redis.hincrby(QUEUE_KEYS.stats, 'dead', 1)

    console.error(`[queue] dead-letter job ${job.id}: ${error}`)
  }

  // Remove from processing
  const processing = await redis.hgetall(QUEUE_KEYS.processing) as Record<string, string> | null
  if (processing?.[job.id]) {
    const newProcessing = { ...processing }
    delete newProcessing[job.id]
    await redis.del(QUEUE_KEYS.processing)
    if (Object.keys(newProcessing).length > 0) {
      await redis.hset(QUEUE_KEYS.processing, newProcessing)
    }
  }
  await redis.hincrby(QUEUE_KEYS.stats, 'processing', -1)
  await redis.hincrby(QUEUE_KEYS.stats, 'failed',      1)
}

// ── Get job by ID ──────────────────────────────────────────────────────────────

export async function getJob(id: string): Promise<QueueJob | null> {
  const redis = getRedis()
  const json = await redis.get(QUEUE_KEYS.jobPrefix(id)) as string | null
  if (!json) return null
  try { return JSON.parse(json) as QueueJob }
  catch { return null }
}

// ── Queue stats ────────────────────────────────────────────────────────────────

export async function getQueueStats(): Promise<QueueStats> {
  const redis   = getRedis()
  const stats   = await redis.hgetall(QUEUE_KEYS.stats) as Record<string, string> | null
  const pending = await redis.llen(QUEUE_KEYS.pending) as number
  const dead    = await redis.llen(QUEUE_KEYS.dead)    as number

  const processing = Object.keys(
    (await redis.hgetall(QUEUE_KEYS.processing) as Record<string, string> | null) ?? {}
  ).length

  return {
    queued:     pending,
    processing,
    failed:     Number(stats?.['failed']    ?? 0),
    dead:       dead,
    processed:  Number(stats?.['completed'] ?? 0),
    latencyMs:  0,  // TODO: track avg latency
  }
}

// ── Peek at pending jobs (for monitoring) ─────────────────────────────────────

export async function peekQueue(limit = 10): Promise<QueueJob[]> {
  const redis = getRedis()
  const ids   = await redis.lrange(QUEUE_KEYS.pending, 0, limit - 1) as string[]
  const jobs: QueueJob[] = []

  for (const id of ids) {
    const job = await getJob(id)
    if (job) jobs.push(job)
  }

  return jobs
}

// ── Purge dead-letter queue ────────────────────────────────────────────────────

export async function purgeDeadLetter(): Promise<number> {
  const redis = getRedis()
  const ids   = await redis.lrange(QUEUE_KEYS.dead, 0, -1) as string[]

  for (const id of ids) {
    await redis.del(QUEUE_KEYS.jobPrefix(id))
  }

  await redis.del(QUEUE_KEYS.dead)
  await redis.hset(QUEUE_KEYS.stats, { dead: 0 })

  return ids.length
}
