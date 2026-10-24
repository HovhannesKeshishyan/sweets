import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { findOperatorKey, parseWith } from '../../server/utils/validation'
import { objectIdSchema, paginationQuerySchema } from '../../shared/schemas/common'
import { paginate, toSkipLimit } from '../../server/utils/pagination'

describe('parseWith', () => {
  const schema = z.object({ name: z.string().min(1), quantity: z.number().int().positive() })

  it('returns parsed data on success', () => {
    expect(parseWith(schema, { name: 'Truffle', quantity: 2 })).toEqual({ name: 'Truffle', quantity: 2 })
  })

  it('strips undeclared fields (mass-assignment guard)', () => {
    const result = parseWith(schema, { name: 'Truffle', quantity: 1, role: 'admin', price: 1 })
    expect(result).toEqual({ name: 'Truffle', quantity: 1 })
  })

  it('throws a 422 with field issues on failure', () => {
    try {
      parseWith(schema, { name: '', quantity: -1 })
      expect.unreachable()
    } catch (error) {
      const err = error as { statusCode: number; data: { code: string; issues: { path: string }[] } }
      expect(err.statusCode).toBe(422)
      expect(err.data.code).toBe('VALIDATION_ERROR')
      expect(err.data.issues.map((i) => i.path).sort()).toEqual(['name', 'quantity'])
    }
  })

  it('rejects operator and dotted keys anywhere in the input (NoSQL injection)', () => {
    const loose = z.object({}).passthrough()
    const attempt = (input: unknown) => {
      try {
        parseWith(loose, input)
        return null
      } catch (error) {
        return (error as { statusCode: number }).statusCode
      }
    }
    expect(attempt({ email: { $ne: null } })).toBe(400)
    expect(attempt({ items: [{ product: { $gt: '' } }] })).toBe(400)
    expect(attempt({ 'profile.role': 'admin' })).toBe(400)
    expect(attempt(JSON.parse('{"__proto__": {"x": 1}}'))).toBe(400)
    expect(attempt({ email: 'a@b.co', note: 'costs $5.00' })).toBeNull()
  })

  it('finds operator keys only in keys, not values', () => {
    expect(findOperatorKey({ a: '$where' })).toBeNull()
    expect(findOperatorKey({ a: { b: [{ $where: '1' }] } })).toBe('$where')
  })
})

describe('common schemas', () => {
  it('validates ObjectIds', () => {
    expect(objectIdSchema.safeParse('64b7f0c2a1b2c3d4e5f60718').success).toBe(true)
    expect(objectIdSchema.safeParse('not-an-id').success).toBe(false)
    expect(objectIdSchema.safeParse({ $gt: '' }).success).toBe(false)
  })

  it('coerces and bounds pagination', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 12 })
    expect(paginationQuerySchema.parse({ page: '3', limit: '24' })).toEqual({ page: 3, limit: 24 })
    expect(paginationQuerySchema.safeParse({ limit: '1000' }).success).toBe(false)
    expect(paginationQuerySchema.safeParse({ page: '0' }).success).toBe(false)
  })

  it('computes skip/limit and page totals', () => {
    expect(toSkipLimit({ page: 3, limit: 10 })).toEqual({ skip: 20, limit: 10 })
    expect(paginate(['a'], 25, { page: 1, limit: 10 }).totalPages).toBe(3)
    expect(paginate([], 0, { page: 1, limit: 10 }).totalPages).toBe(1)
  })
})
