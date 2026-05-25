/**
 * KENUXA OPS — Upstash Redis Client (Phase 3)
 * HTTP-based Redis — works on Vercel Edge + Serverless with no socket overhead.
 * Falls back to a no-op in-memory mock when env vars are missing (local dev).
 */
import { Redis } from '@upstash/redis'

const UPSTASH_URL   = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

// ── Real client ────────────────────────────────────────────────────────────────

let _redis: Redis | null = null

export function getRedis(): Redis {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    // Return a proxy that silently no-ops (dev without Redis configured)
    return createMockRedis() as unknown as Redis
  }
  if (!_redis) {
    _redis = new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN })
  }
  return _redis
}

export function isRedisConfigured(): boolean {
  return Boolean(UPSTASH_URL && UPSTASH_TOKEN)
}

// ── Queue key helpers ──────────────────────────────────────────────────────────

export const QUEUE_KEYS = {
  pending:    'ops:queue:pending',           // List — jobs waiting to run
  processing: 'ops:queue:processing',        // Hash  — currently running
  dead:       'ops:queue:dead',              // List  — permanently failed
  stats:      'ops:queue:stats',             // Hash  — counters
  health:     'ops:health:latest',           // String (JSON) — latest health
  jobPrefix:  (id: string) => `ops:job:${id}`,   // Hash — job detail
  lockPrefix: (id: string) => `ops:lock:${id}`,  // String — processing lock
} as const

// ── Dev mock (when Upstash not configured) ─────────────────────────────────────

const mockStore: Map<string, unknown> = new Map()
const mockLists: Map<string, unknown[]> = new Map()

function createMockRedis() {
  return {
    lpush: async (key: string, ...vals: unknown[]) => {
      const list = mockLists.get(key) ?? []
      list.unshift(...vals)
      mockLists.set(key, list)
      return list.length
    },
    rpop: async (key: string) => {
      const list = mockLists.get(key) ?? []
      return list.pop() ?? null
    },
    rpoplpush: async (src: string, dst: string) => {
      const srcList = mockLists.get(src) ?? []
      const val = srcList.pop()
      mockLists.set(src, srcList)
      if (val !== undefined) {
        const dstList = mockLists.get(dst) ?? []
        dstList.unshift(val)
        mockLists.set(dst, dstList)
      }
      return val ?? null
    },
    lrange: async (key: string, start: number, stop: number) => {
      const list = mockLists.get(key) ?? []
      return list.slice(start, stop === -1 ? undefined : stop + 1)
    },
    llen: async (key: string) => (mockLists.get(key) ?? []).length,
    lrem:  async () => 0,
    set:   async (key: string, val: unknown) => { mockStore.set(key, val); return 'OK' },
    get:   async (key: string) => mockStore.get(key) ?? null,
    del:   async (key: string) => { mockStore.delete(key); return 1 },
    hset:  async (key: string, obj: Record<string, unknown>) => {
      const existing = (mockStore.get(key) as Record<string, unknown>) ?? {}
      mockStore.set(key, { ...existing, ...obj })
      return Object.keys(obj).length
    },
    hget:  async (key: string, field: string) => {
      return (mockStore.get(key) as Record<string, unknown>)?.[field] ?? null
    },
    hgetall: async (key: string) => (mockStore.get(key) as Record<string, unknown>) ?? null,
    hincrby: async (key: string, field: string, by: number) => {
      const h = (mockStore.get(key) as Record<string, number>) ?? {}
      h[field] = (h[field] ?? 0) + by
      mockStore.set(key, h)
      return h[field]
    },
    expire: async () => 1,
    setex:  async (key: string, _ttl: number, val: unknown) => {
      mockStore.set(key, val)
      return 'OK'
    },
    exists: async (key: string) => (mockStore.has(key) ? 1 : 0),
  }
}
