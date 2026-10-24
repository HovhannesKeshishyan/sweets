import { describe, expect, it } from 'vitest'
import { createRateLimiter, MemoryRateLimitStore } from '../../server/services/rate-limiter'
import { isAllowedOrigin, isSafeMethod } from '../../server/services/origin'
import { generateToken, hashToken } from '../../server/services/session.service'
import { safeRedirect } from '../../app/utils/safe-redirect'

describe('rate limiter', () => {
  const rule = { name: 'test', limit: 3, windowMs: 60_000 }

  it('allows up to the limit, then blocks until the window resets', async () => {
    const check = createRateLimiter(new MemoryRateLimitStore())
    const t0 = 1_000_000
    for (let i = 0; i < 3; i++) expect((await check(rule, 'ip-1', t0)).allowed).toBe(true)

    const blocked = await check(rule, 'ip-1', t0 + 1_000)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterSeconds).toBe(59)

    expect((await check(rule, 'ip-1', t0 + 60_001)).allowed).toBe(true)
  })

  it('tracks keys and rule names independently', async () => {
    const check = createRateLimiter(new MemoryRateLimitStore())
    for (let i = 0; i < 3; i++) await check(rule, 'ip-1', 0)
    expect((await check(rule, 'ip-1', 0)).allowed).toBe(false)
    expect((await check(rule, 'ip-2', 0)).allowed).toBe(true)
    expect((await check({ ...rule, name: 'other' }, 'ip-1', 0)).allowed).toBe(true)
  })

  it('bounds memory use', async () => {
    const store = new MemoryRateLimitStore(100)
    const check = createRateLimiter(store)
    for (let i = 0; i < 500; i++) await check(rule, `ip-${i}`, 0)
    expect((store as unknown as { buckets: Map<string, unknown> }).buckets.size).toBeLessThanOrEqual(100)
  })
})

describe('CSRF origin check', () => {
  const site = 'https://shop.example.com'

  it('allows same-origin and missing Origin', () => {
    expect(isAllowedOrigin('https://shop.example.com', 'shop.example.com', site)).toBe(true)
    expect(isAllowedOrigin('http://localhost:3000', 'localhost:3000', site)).toBe(true)
    expect(isAllowedOrigin(undefined, 'shop.example.com', site)).toBe(true)
  })

  it('blocks foreign, opaque and malformed origins', () => {
    expect(isAllowedOrigin('https://evil.example', 'shop.example.com', site)).toBe(false)
    expect(isAllowedOrigin('https://shop.example.com.evil.example', 'shop.example.com', site)).toBe(false)
    expect(isAllowedOrigin('null', 'shop.example.com', site)).toBe(false)
    expect(isAllowedOrigin('not a url', 'shop.example.com', site)).toBe(false)
  })

  it('classifies safe methods', () => {
    expect(isSafeMethod('get')).toBe(true)
    expect(isSafeMethod('POST')).toBe(false)
    expect(isSafeMethod('DELETE')).toBe(false)
  })
})

describe('session tokens', () => {
  it('are long, random and URL-safe', () => {
    const a = generateToken()
    expect(a).toMatch(/^[\w-]{43}$/)
    expect(generateToken()).not.toBe(a)
  })

  it('are stored as a keyed hash that depends on the secret', () => {
    const token = generateToken()
    const secret = 'x'.repeat(32)
    expect(hashToken(token, secret)).toBe(hashToken(token, secret))
    expect(hashToken(token, secret)).not.toBe(token)
    expect(hashToken(token, 'y'.repeat(32))).not.toBe(hashToken(token, secret))
  })
})

describe('safeRedirect', () => {
  it('keeps internal paths', () => {
    expect(safeRedirect('/account')).toBe('/account')
    expect(safeRedirect('/admin/orders?page=2')).toBe('/admin/orders?page=2')
  })

  it('rejects external and protocol-relative targets', () => {
    expect(safeRedirect('https://evil.example')).toBe('/')
    expect(safeRedirect('//evil.example')).toBe('/')
    expect(safeRedirect('/\\evil.example')).toBe('/')
    expect(safeRedirect(['/a'])).toBe('/')
    expect(safeRedirect(undefined, '/account')).toBe('/account')
  })
})
