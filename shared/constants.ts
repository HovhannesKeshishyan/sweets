/** Enumerations shared by models, schemas and UI. */

export const USER_ROLES = ["customer", "admin"] as const
export type UserRole = (typeof USER_ROLES)[number]

export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const
export type ProductStatus = (typeof PRODUCT_STATUSES)[number]

export const COUPON_TYPES = ["percentage", "fixed"] as const
export type CouponType = (typeof COUPON_TYPES)[number]

/** Fulfillment lifecycle, independent of payment. */
export const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const PAYMENT_STATUSES = ["unpaid", "paid", "refunded"] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const PASSWORD_MIN_LENGTH = 10
export const PASSWORD_MAX_LENGTH = 128

/** Per-line purchase cap, also bounded by stock. */
export const MAX_QUANTITY_PER_LINE = 20
export const MAX_CART_LINES = 50
/** Stock at or below this shows as "only a few left" and on the admin dashboard. */
export const LOW_STOCK_THRESHOLD = 5
