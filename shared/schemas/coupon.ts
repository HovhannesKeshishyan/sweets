import { z } from 'zod'
import { COUPON_TYPES } from '../constants'
import { objectIdSchema } from './common'
import { minorAmountSchema } from './fields'

const couponFields = {
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/, 'Use letters, numbers, hyphens or underscores'),
  description: z.string().trim().max(300),
  type: z.enum(COUPON_TYPES),
  value: z.number().int().min(1),
  minOrderAmount: minorAmountSchema,
  maxDiscountAmount: minorAmountSchema.min(1),
  startsAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  usageLimit: z.number().int().min(1),
  products: z.array(objectIdSchema).max(200),
  categories: z.array(objectIdSchema).max(50),
  isActive: z.boolean(),
}

type CouponShape = {
  type?: (typeof COUPON_TYPES)[number]
  value?: number
  startsAt?: Date
  expiresAt?: Date
}

function couponRules(c: CouponShape, ctx: z.RefinementCtx) {
  if (c.type === 'percentage' && c.value !== undefined && c.value > 100) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'Percentage cannot exceed 100' })
  }
  if (c.startsAt && c.expiresAt && c.expiresAt <= c.startsAt) {
    ctx.addIssue({ code: 'custom', path: ['expiresAt'], message: 'Expiry must be after the start date' })
  }
}

export const couponInputSchema = z
  .object({
    ...couponFields,
    description: couponFields.description.optional(),
    minOrderAmount: couponFields.minOrderAmount.default(0),
    maxDiscountAmount: couponFields.maxDiscountAmount.optional(),
    startsAt: couponFields.startsAt.optional(),
    expiresAt: couponFields.expiresAt.optional(),
    usageLimit: couponFields.usageLimit.optional(),
    products: couponFields.products.default([]),
    categories: couponFields.categories.default([]),
    isActive: couponFields.isActive.default(true),
  })
  .superRefine(couponRules)

/** `null` clears an optional limit or date. */
export const couponUpdateSchema = z
  .object({
    ...couponFields,
    maxDiscountAmount: couponFields.maxDiscountAmount.nullable(),
    startsAt: couponFields.startsAt.nullable(),
    expiresAt: couponFields.expiresAt.nullable(),
    usageLimit: couponFields.usageLimit.nullable(),
  })
  .partial()
  .superRefine((c, ctx) =>
    couponRules(
      { ...c, startsAt: c.startsAt ?? undefined, expiresAt: c.expiresAt ?? undefined },
      ctx,
    ),
  )

export const applyCouponSchema = z.object({
  code: couponFields.code,
})

export type CouponInput = z.infer<typeof couponInputSchema>
export type CouponUpdateInput = z.infer<typeof couponUpdateSchema>
