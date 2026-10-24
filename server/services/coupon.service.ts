import { createError } from 'h3'
import type { CouponInput, CouponUpdateInput } from '../../shared/schemas/coupon'
import type { CouponDTO } from '../../shared/types/api'
import { Category, Coupon, Product, type ICoupon } from '../db/models'
import { isDuplicateKey } from './errors'

export function toCouponDTO(c: ICoupon): CouponDTO {
  return {
    id: String(c._id),
    code: c.code,
    description: c.description ?? null,
    type: c.type,
    value: c.value,
    minOrderAmount: c.minOrderAmount,
    maxDiscountAmount: c.maxDiscountAmount ?? null,
    startsAt: c.startsAt?.toISOString() ?? null,
    expiresAt: c.expiresAt?.toISOString() ?? null,
    usageLimit: c.usageLimit ?? null,
    usedCount: c.usedCount,
    products: c.products.map(String),
    categories: c.categories.map(String),
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
  }
}

async function assertReferencesExist(input: { products?: string[]; categories?: string[] }) {
  if (input.products?.length) {
    const found = await Product.countDocuments({ _id: { $in: input.products } })
    if (found !== new Set(input.products).size) {
      throw createError({ statusCode: 422, statusMessage: 'One or more selected products do not exist' })
    }
  }
  if (input.categories?.length) {
    const found = await Category.countDocuments({ _id: { $in: input.categories } })
    if (found !== new Set(input.categories).size) {
      throw createError({ statusCode: 422, statusMessage: 'One or more selected categories do not exist' })
    }
  }
}

export async function listCoupons(): Promise<CouponDTO[]> {
  const coupons = await Coupon.find().sort({ createdAt: -1 }).lean()
  return coupons.map(toCouponDTO)
}

export async function getCoupon(id: string): Promise<CouponDTO> {
  const coupon = await Coupon.findById(id).lean()
  if (!coupon) throw createError({ statusCode: 404, statusMessage: 'Coupon not found' })
  return toCouponDTO(coupon)
}

export async function createCoupon(input: CouponInput): Promise<CouponDTO> {
  await assertReferencesExist(input)
  try {
    const coupon = await Coupon.create(input)
    return toCouponDTO(coupon.toObject())
  } catch (error) {
    if (isDuplicateKey(error)) throw createError({ statusCode: 409, statusMessage: 'A coupon with this code already exists' })
    throw error
  }
}

/** Partial update; `null` clears an optional field. `usedCount` is never editable. */
export async function updateCoupon(id: string, input: CouponUpdateInput): Promise<CouponDTO> {
  await assertReferencesExist(input)
  const existing = await Coupon.findById(id).lean()
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Coupon not found' })

  const type = input.type ?? existing.type
  const value = input.value ?? existing.value
  if (type === 'percentage' && value > 100) {
    throw createError({ statusCode: 422, statusMessage: 'Percentage cannot exceed 100' })
  }
  const startsAt = input.startsAt === undefined ? existing.startsAt : input.startsAt
  const expiresAt = input.expiresAt === undefined ? existing.expiresAt : input.expiresAt
  if (startsAt && expiresAt && expiresAt <= startsAt) {
    throw createError({ statusCode: 422, statusMessage: 'Expiry must be after the start date' })
  }

  const $set: Record<string, unknown> = {}
  const $unset: Record<string, ''> = {}
  for (const [key, val] of Object.entries(input)) {
    if (val === undefined) continue
    if (val === null) $unset[key] = ''
    else $set[key] = val
  }
  try {
    const updated = await Coupon.findByIdAndUpdate(
      id,
      { ...(Object.keys($set).length ? { $set } : {}), ...(Object.keys($unset).length ? { $unset } : {}) },
      { returnDocument: 'after', runValidators: true },
    ).lean()
    if (!updated) throw createError({ statusCode: 404, statusMessage: 'Coupon not found' })
    return toCouponDTO(updated)
  } catch (error) {
    if (isDuplicateKey(error)) throw createError({ statusCode: 409, statusMessage: 'A coupon with this code already exists' })
    throw error
  }
}
