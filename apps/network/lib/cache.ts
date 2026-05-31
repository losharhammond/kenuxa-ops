// ─── KENUXA Cache Utility ────────────────────────────────────────────────────
// Uses Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
// are set; falls back to an in-process LRU-style Map cache.
// Both paths expose the same interface: get / set / del.

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// In-memory fallback store (per serverless instance)
const memCache = new Map<string, CacheEntry<unknown>>();

let lastMemPurge = Date.now();
function purgeMemCache() {
  const now = Date.now();
  if (now - lastMemPurge < 120_000) return;
  lastMemPurge = now;
  for (const [k, v] of memCache.entries()) {
    if (now > v.expiresAt) memCache.delete(k);
  }
}

// ── Upstash Redis helpers ────────────────────────────────────────────────────
async function redisGet<T>(key: string): Promise<T | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    });
    const json = await res.json() as { result: string | null };
    if (!json.result) return null;
    return JSON.parse(json.result) as T;
  } catch {
    return null;
  }
}

async function redisSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  try {
    await fetch(`${url}/set/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ value: JSON.stringify(value), ex: ttlSeconds }),
      next: { revalidate: 0 },
    });
  } catch {
    // silent — cache write failure is non-fatal
  }
}

async function redisDel(key: string): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  try {
    await fetch(`${url}/del/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    });
  } catch {
    // silent
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  // Try Redis first
  const redisVal = await redisGet<T>(key);
  if (redisVal !== null) return redisVal;

  // Fallback: in-memory
  purgeMemCache();
  const entry = memCache.get(key) as CacheEntry<T> | undefined;
  if (!entry || Date.now() > entry.expiresAt) {
    memCache.delete(key);
    return null;
  }
  return entry.value;
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  // Write to Redis (fire-and-forget)
  redisSet(key, value, ttlSeconds).catch(() => null);

  // Always write to in-memory as well (serves as L1)
  memCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function cacheDel(key: string): Promise<void> {
  memCache.delete(key);
  await redisDel(key);
}

/**
 * Wrap an async computation with cache.
 * @param key   Cache key
 * @param ttl   TTL in seconds
 * @param fn    Async function that produces the value on cache miss
 */
export async function withCache<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;
  const fresh = await fn();
  await cacheSet(key, fresh, ttl);
  return fresh;
}
