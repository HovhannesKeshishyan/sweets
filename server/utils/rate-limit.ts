import { createError, getRequestIP, setHeader, type H3Event } from "h3"
import { createRateLimiter, type RateLimitRule } from "../services/rate-limiter"

const check = createRateLimiter()

/**
 * Client IP. X-Forwarded-For is honoured only when NUXT_TRUST_PROXY=true
 * (i.e. behind a proxy you control); otherwise it could be spoofed.
 */
export function getClientIp(event: H3Event): string {
  const { trustProxy } = useRuntimeConfig()
  return getRequestIP(event, { xForwardedFor: Boolean(trustProxy) }) ?? "unknown"
}

/** Throws 429 with Retry-After when the rule is exceeded for this key (default: client IP). */
export async function enforceRateLimit(event: H3Event, rule: RateLimitRule, key = getClientIp(event)) {
  const result = await check(rule, key)
  setHeader(event, "RateLimit-Limit", rule.limit)
  setHeader(event, "RateLimit-Remaining", result.remaining)
  if (!result.allowed) {
    setHeader(event, "Retry-After", result.retryAfterSeconds)
    throw createError({ statusCode: 429, statusMessage: "Too many requests. Please try again later." })
  }
}
