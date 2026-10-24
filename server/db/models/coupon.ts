import { Schema, type Types } from 'mongoose'
import { COUPON_TYPES, type CouponType } from '../../../shared/constants'
import { cleanJson, defineModel } from './_shared'

export interface ICoupon {
  _id: Types.ObjectId
  code: string
  description?: string
  type: CouponType
  /** Percentage (1–100) for `percentage`, minor units for `fixed`. */
  value: number
  /** Minimum eligible subtotal in minor units. */
  minOrderAmount: number
  /** Cap on the discount for percentage coupons, in minor units. */
  maxDiscountAmount?: number
  startsAt?: Date
  expiresAt?: Date
  /** Total redemptions allowed; unset means unlimited. */
  usageLimit?: number
  /** Incremented atomically when an order using the coupon is placed. */
  usedCount: number
  /** Restrictions: when both are empty the coupon applies to the whole cart. */
  products: Types.ObjectId[]
  categories: Types.ObjectId[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const integer = { validator: Number.isSafeInteger, message: '{PATH} must be an integer' }

const couponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 40 },
    description: { type: String, trim: true, maxlength: 300 },
    type: { type: String, enum: COUPON_TYPES, required: true },
    value: { type: Number, required: true, min: 1, validate: integer },
    minOrderAmount: { type: Number, default: 0, min: 0, validate: integer },
    maxDiscountAmount: { type: Number, min: 1, validate: integer },
    startsAt: { type: Date },
    expiresAt: { type: Date },
    usageLimit: { type: Number, min: 1, validate: integer },
    usedCount: { type: Number, default: 0, min: 0, validate: integer },
    products: { type: [{ type: Schema.Types.ObjectId, ref: 'Product' }], default: [] },
    categories: { type: [{ type: Schema.Types.ObjectId, ref: 'Category' }], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { transform: cleanJson } },
)

couponSchema.path('value').validate(function (this: ICoupon, value: number) {
  return this.type !== 'percentage' || value <= 100
}, 'Percentage coupons cannot exceed 100')

couponSchema.index({ isActive: 1, expiresAt: 1 })

export const Coupon = defineModel<ICoupon>('Coupon', couponSchema)
