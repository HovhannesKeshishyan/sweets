/**
 * Fixed-window rate limiter.
 *
 * The default store is in-process memory: correct for a single Node instance.
 * When running several instances, implement `RateLimitStore` on Redis (INCR + PEXPIRE)
 * and pass it to `createRateLimiter`.
 */

export interface RateLimitStore {
  /** Increments the counter for `key` and returns the new count and window reset time. */
  hit(key: string, windowMs: number, now: number): Promise<{ count: number; resetAt: number }>
}

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>()
  private lastSweep = 0

  constructor(private readonly maxKeys = 50_000) {}

  async hit(key: string, windowMs: number, now: number) {
    this.sweep(now)
    const bucket = this.buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowMs }
      this.buckets.set(key, fresh)
      return { ...fresh }
    }
    bucket.count += 1
    return { ...bucket }
  }

  /** Drops expired buckets periodically, and the oldest entries if the map grows too large. */
  private sweep(now: number) {
    if (now - this.lastSweep < 60_000 && this.buckets.size < this.maxKeys) return
    this.lastSweep = now
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key)
    }
    while (this.buckets.size >= this.maxKeys) {
      const oldest = this.buckets.keys().next().value
      if (oldest === undefined) break
      this.buckets.delete(oldest)
    }
  }
}

export interface RateLimitRule {
  /** Namespace, e.g. "login". */
  name: string
  limit: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export function createRateLimiter(store: RateLimitStore = new MemoryRateLimitStore()) {
  return async function check(rule: RateLimitRule, key: string, now = Date.now()): Promise<RateLimitResult> {
    const { count, resetAt } = await store.hit(`${rule.name}:${key}`, rule.windowMs, now)
    return {
      allowed: count <= rule.limit,
      remaining: Math.max(0, rule.limit - count),
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    }
  }
}

/** Limits for sensitive endpoints. */
export const RATE_LIMITS = {
  login: { name: "login", limit: 10, windowMs: 15 * 60_000 },
  loginAccount: { name: "login-account", limit: 5, windowMs: 15 * 60_000 },
  register: { name: "register", limit: 5, windowMs: 60 * 60_000 },
  checkout: { name: "checkout", limit: 20, windowMs: 15 * 60_000 },
  coupon: { name: "coupon", limit: 30, windowMs: 15 * 60_000 },
} satisfies Record<string, RateLimitRule>
