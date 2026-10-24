import { Schema, type Types } from "mongoose"
import {
  COUPON_TYPES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type CouponType,
  type OrderStatus,
  type PaymentStatus,
} from "../../../shared/constants"
import { addressSchema, cleanJson, defineModel, moneyField, type Address } from "./_shared"

/** Snapshot of a product at purchase time; later product edits never change it. */
export interface OrderItem {
  product: Types.ObjectId
  name: string
  slug: string
  sku?: string
  image?: string
  unitPrice: number
  quantity: number
  /** Discount allocated to this line, minor units. */
  discount: number
  /** unitPrice × quantity − discount. */
  lineTotal: number
}

export interface OrderCoupon {
  code: string
  type: CouponType
  value: number
  discount: number
}

export interface IOrder {
  _id: Types.ObjectId
  orderNumber: string
  user?: Types.ObjectId
  customer: { email: string; name: string; phone?: string }
  shippingAddress: Address
  items: OrderItem[]
  currency: string
  subtotal: number
  discountTotal: number
  shippingTotal: number
  total: number
  coupon?: OrderCoupon
  status: OrderStatus
  paymentStatus: PaymentStatus
  /** Reserved for a future provider such as Stripe. Card data is never stored. */
  payment?: { provider?: string; reference?: string }
  notes?: string
  statusHistory: { status: OrderStatus; at: Date; by?: Types.ObjectId; note?: string }[]
  /** HMAC of the token in the guest confirmation link. */
  accessTokenHash: string
  createdAt: Date
  updatedAt: Date
}

const integerQty = { validator: Number.isSafeInteger, message: "Quantity must be an integer" }

const orderItemSchema = new Schema<OrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    sku: { type: String },
    image: { type: String },
    unitPrice: moneyField,
    quantity: { type: Number, required: true, min: 1, validate: integerQty },
    discount: { ...moneyField, default: 0 },
    lineTotal: moneyField,
  },
  { _id: false },
)

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    customer: {
      email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
      name: { type: String, required: true, trim: true, maxlength: 100 },
      phone: { type: String, trim: true, maxlength: 30 },
    },
    shippingAddress: { type: addressSchema, required: true },
    items: {
      type: [orderItemSchema],
      validate: { validator: (v: unknown[]) => v.length > 0, message: "Order needs at least one item" },
    },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    subtotal: moneyField,
    discountTotal: { ...moneyField, default: 0 },
    shippingTotal: { ...moneyField, default: 0 },
    total: moneyField,
    coupon: {
      type: new Schema<OrderCoupon>(
        {
          code: { type: String, required: true },
          type: { type: String, enum: COUPON_TYPES, required: true },
          value: { type: Number, required: true },
          discount: moneyField,
        },
        { _id: false },
      ),
    },
    status: { type: String, enum: ORDER_STATUSES, default: "pending", required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "unpaid", required: true },
    payment: { provider: String, reference: String },
    notes: { type: String, trim: true, maxlength: 1000 },
    statusHistory: {
      type: [
        {
          status: { type: String, enum: ORDER_STATUSES, required: true },
          at: { type: Date, default: Date.now },
          by: { type: Schema.Types.ObjectId, ref: "User" },
          note: { type: String, maxlength: 500 },
          _id: false,
        },
      ],
      default: [],
    },
    accessTokenHash: { type: String, required: true, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret: Record<string, unknown>) {
        delete ret.accessTokenHash
        return cleanJson(doc, ret)
      },
    },
  },
)

orderSchema.index({ user: 1, createdAt: -1 })
orderSchema.index({ "customer.email": 1, createdAt: -1 })
orderSchema.index({ status: 1, createdAt: -1 })
orderSchema.index({ createdAt: -1 })

export const Order = defineModel<IOrder>("Order", orderSchema)
