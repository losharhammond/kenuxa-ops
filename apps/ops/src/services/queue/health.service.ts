/**
 * KENUXA OPS — Health Check Service (Phase 3)
 * Probes all system dependencies and returns a unified health status.
 * Results are cached in Redis for 5 minutes.
 */
import { getRedis, QUEUE_KEYS, isRedisConfigured } from '@/lib/queue/redis'
import { getQueueStats }                            from './queue.service'
import { checkWorkerHealth }                        from '@/services/worker/playwright.client'
import { pingCore }                                 from '@/services/core-connector/core.service'
import type { SystemHealth, ServiceHealth, ServiceStatus, QueueStats } from '@/types/ops'

const CACHE_TTL_S = 300  // cache health results for 5 minutes

// ── Individual probes ──────────────────────────────────────────────────────────

async function probeSupabase(): Promise<ServiceHealth> {
  const start = Date.now()
  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabase = await createServiceClient()
    const { error } = await supabase.from('ops_executions').select('id').limit(1)
    const latencyMs = Date.now() - start

    return {
      name:      'Supabase',
      status:    error ? 'degraded' : 'online',
      latencyMs,
      message:   error?.message,
      checkedAt: new Date().toISOString(),
    }
  } catch (err) {
    return {
      name:      'Supabase',
      status:    'offline',
      latencyMs: Date.now() - start,
      message:   (err as Error).message,
      checkedAt: new Date().toISOString(),
    }
  }
}

async function probeCore(): Promise<ServiceHealth> {
  const start = Date.now()
  try {
    const online = await pingCore()
    return {
      name:      'KENUXA CORE',
      status:    online ? 'online' : 'offline',
      latencyMs: Date.now() - start,
      message:   online ? undefined : 'CORE did not respond',
      checkedAt: new Date().toISOString(),
    }
  } catch (err) {
    return {
      name:      'KENUXA CORE',
      status:    'offline',
      latencyMs: Date.now() - start,
      message:   (err as Error).message,
      checkedAt: new Date().toISOString(),
    }
  }
}

async function probeRedis(): Promise<ServiceHealth> {
  const start = Date.now()
  if (!isRedisConfigured()) {
    return {
      name:      'Redis Queue (Upstash)',
      status:    'unknown',
      message:   'UPSTASH_REDIS_REST_URL not configured',
      checkedAt: new Date().toISOString(),
    }
  }

  try {
    const redis = getRedis()
    await redis.set('ops:health:ping', 'pong')
    const val = await redis.get('ops:health:ping')
    const ok  = val === 'pong'
    return {
      name:      'Redis Queue (Upstash)',
      status:    ok ? 'online' : 'degraded',
      latencyMs: Date.now() - start,
      message:   ok ? undefined : 'Ping/pong mismatch',
      checkedAt: new Date().toISOString(),
    }
  } catch (err) {
    return {
      name:      'Redis Queue (Upstash)',
      status:    'offline',
      latencyMs: Date.now() - start,
      message:   (err as Error).message,
      checkedAt: new Date().toISOString(),
    }
  }
}

async function probePlaywrightWorker(): Promise<ServiceHealth> {
  const start = Date.now()
  const workerUrl = process.env.PLAYWRIGHT_WORKER_URL

  if (!workerUrl) {
    return {
      name:      'Playwright Worker',
      status:    'unknown',
      message:   'PLAYWRIGHT_WORKER_URL not configured — using AI simulation fallback',
      checkedAt: new Date().toISOString(),
    }
  }

  try {
    const { online, latencyMs } = await checkWorkerHealth()
    return {
      name:      'Playwright Worker',
      status:    online ? 'online' : 'offline',
      latencyMs: latencyMs ?? Date.now() - start,
      message:   online ? undefined : 'Worker did not respond',
      checkedAt: new Date().toISOString(),
    }
  } catch (err) {
    return {
      name:      'Playwright Worker',
      status:    'offline',
      latencyMs: Date.now() - start,
      message:   (err as Error).message,
      checkedAt: new Date().toISOString(),
    }
  }
}

async function probeGroq(): Promise<ServiceHealth> {
  const start = Date.now()
  if (!process.env.GROQ_OPS_API_KEY) {
    return {
      name:      'Groq AI',
      status:    'unknown',
      message:   'GROQ_OPS_API_KEY not set',
      checkedAt: new Date().toISOString(),
    }
  }

  try {
    const { getGroq } = await import('@/lib/groq/client')
    const groq = getGroq()
    // Minimal test completion
    await groq.chat.completions.create({
      model:      'llama-3.1-8b-instant',
      max_tokens: 5,
      messages:   [{ role: 'user', content: 'ping' }],
    })
    return {
      name:      'Groq AI',
      status:    'online',
      latencyMs: Date.now() - start,
      checkedAt: new Date().toISOString(),
    }
  } catch (err) {
    return {
      name:      'Groq AI',
      status:    'offline',
      latencyMs: Date.now() - start,
      message:   (err as Error).message,
      checkedAt: new Date().toISOString(),
    }
  }
}

// ── Overall health aggregation ─────────────────────────────────────────────────

function aggregateStatus(services: ServiceHealth[]): ServiceStatus {
  if (services.some(s => s.status === 'offline' && ['Supabase', 'Groq AI'].includes(s.name))) {
    return 'degraded'
  }
  if (services.every(s => s.status === 'online')) return 'online'
  if (services.some(s => s.status === 'offline')) return 'degraded'
  return 'online'
}

// ── Main health check ──────────────────────────────────────────────────────────

export async function runHealthCheck(forceRefresh = false): Promise<SystemHealth> {
  const redis     = getRedis()
  const cacheKey  = QUEUE_KEYS.health

  // Return cached result if available and not forcing refresh
  if (!forceRefresh) {
    const cached = await redis.get(cacheKey) as string | null
    if (cached) {
      try { return JSON.parse(cached) as SystemHealth } catch { /* ignore */ }
    }
  }

  // Run all probes in parallel (with individual timeouts)
  const [supabase, core, redisHealth, worker, groq, queueStats] = await Promise.all([
    Promise.race([probeSupabase(),        timeoutHealth('Supabase',           3000)]),
    Promise.race([probeCore(),            timeoutHealth('KENUXA CORE',        4000)]),
    Promise.race([probeRedis(),           timeoutHealth('Redis Queue',         3000)]),
    Promise.race([probePlaywrightWorker(), timeoutHealth('Playwright Worker',  5000)]),
    Promise.race([probeGroq(),            timeoutHealth('Groq AI',             5000)]),
    getQueueStats().catch((): QueueStats => ({
      queued: 0, processing: 0, failed: 0, dead: 0, processed: 0, latencyMs: 0,
    })),
  ])

  const services = [supabase, core, redisHealth, worker, groq]
  const health: SystemHealth = {
    overall:    aggregateStatus(services),
    services,
    queueStats,
    checkedAt:  new Date().toISOString(),
  }

  // Cache for 5 minutes
  try {
    await redis.setex(cacheKey, CACHE_TTL_S, JSON.stringify(health))
  } catch { /* ignore cache failure */ }

  return health
}

// ── Timeout helper ─────────────────────────────────────────────────────────────

function timeoutHealth(name: string, ms: number): Promise<ServiceHealth> {
  return new Promise(resolve =>
    setTimeout(() => resolve({
      name,
      status:    'unknown',
      message:   `Probe timed out after ${ms}ms`,
      checkedAt: new Date().toISOString(),
    }), ms)
  )
}
