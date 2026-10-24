import { randomInt, timingSafeEqual } from "node:crypto"
import { createError } from "h3"
import mongoose, { type QueryFilter, type Types } from "mongoose"
import type { OrderStatus } from "../../shared/constants"
import type { CheckoutInput } from "../../shared/schemas/cart"
import type { Paginated } from "../../shared/schemas/common"
import { canTransition, type AdminOrderListQuery } from "../../shared/schemas/order"
import type { OrderDTO, OrderSummaryDTO } from "../../shared/types/api"
import { Coupon, Order, Product, type IOrder } from "../db/models"
import { quoteCart, toQuoteDTO } from "./cart.service"
import { escapeRegex, isDuplicateKey } from "./errors"
import { generateToken, hashToken } from "./session.service"
import type { ResolvedSettings } from "./settings.service"

/* --------------------------------- Mapping --------------------------------- */

export function toOrderDTO(o: IOrder): OrderDTO {
  return {
    id: String(o._id),
    orderNumber: o.orderNumber,
    status: o.status,
    paymentStatus: o.paymentStatus,
    customer: { email: o.customer.email, name: o.customer.name, phone: o.customer.phone ?? null },
    shippingAddress: {
      line1: o.shippingAddress.line1,
      line2: o.shippingAddress.line2 ?? null,
      city: o.shippingAddress.city,
      region: o.shippingAddress.region ?? null,
      postalCode: o.shippingAddress.postalCode,
      country: o.shippingAddress.country,
    },
    items: o.items.map((i) => ({
      productId: String(i.product),
      name: i.name,
      slug: i.slug,
      sku: i.sku ?? null,
      image: i.image ?? null,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      discount: i.discount,
      lineTotal: i.lineTotal,
    })),
    currency: o.currency,
    subtotal: o.subtotal,
    discountTotal: o.discountTotal,
    shippingTotal: o.shippingTotal,
    total: o.total,
    coupon: o.coupon
      ? { code: o.coupon.code, type: o.coupon.type, value: o.coupon.value, discount: o.coupon.discount }
      : null,
    notes: o.notes ?? null,
    statusHistory: o.statusHistory.map((h) => ({ status: h.status, at: h.at.toISOString(), note: h.note ?? null })),
    isGuest: !o.user,
    createdAt: o.createdAt.toISOString(),
  }
}

export function toOrderSummary(o: IOrder): OrderSummaryDTO {
  return {
    id: String(o._id),
    orderNumber: o.orderNumber,
    status: o.status,
    paymentStatus: o.paymentStatus,
    customerName: o.customer.name,
    customerEmail: o.customer.email,
    itemCount: o.items.reduce((n, i) => n + i.quantity, 0),
    total: o.total,
    currency: o.currency,
    createdAt: o.createdAt.toISOString(),
  }
}

/* ------------------------------ Order numbers ------------------------------ */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no 0/O/1/I

/** e.g. MC-261024-7KQ2ZD — readable, not sequential (doesn't leak order volume). */
export function generateOrderNumber(now = new Date()): string {
  const yy = String(now.getUTCFullYear() % 100).padStart(2, "0")
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(now.getUTCDate()).padStart(2, "0")
  let suffix = ""
  for (let i = 0; i < 6; i++) suffix += ALPHABET[randomInt(ALPHABET.length)]
  return `MC-${yy}${mm}${dd}-${suffix}`
}

/* -------------------------------- Checkout --------------------------------- */

function conflict(code: string, statusMessage: string, extra: Record<string, unknown> = {}) {
  return createError({ statusCode: 409, statusMessage, data: { code, ...extra } })
}

export interface PlaceOrderResult {
  order: OrderDTO
  /** Shown once in the confirmation link so guests can view their order. */
  accessToken: string
}

/**
 * Places an order. Inside one transaction it re-prices the cart from the
 * database, decrements stock with conditional updates (`stock >= qty`), claims
 * a coupon use (`usedCount < usageLimit`) and inserts the order. Any failure
 * rolls everything back; concurrent write conflicts are retried by the driver.
 */
export async function placeOrder(
  input: CheckoutInput,
  settings: ResolvedSettings,
  options: { userId?: Types.ObjectId | null; secret: string },
): Promise<PlaceOrderResult> {
  const country = input.shippingAddress.country
  if (settings.shipping.allowedCountries.length && !settings.shipping.allowedCountries.includes(country)) {
    throw createError({
      statusCode: 422,
      statusMessage: "Validation failed",
      data: {
        code: "VALIDATION_ERROR",
        issues: [{ path: "shippingAddress.country", message: "Sorry, we don't ship to this country yet." }],
      },
    })
  }

  const accessToken = generateToken()
  const session = await mongoose.startSession()
  try {
    let created: IOrder | undefined
    await session.withTransaction(async () => {
      const quote = await quoteCart(input, settings, session)

      if (quote.issues.length) {
        throw conflict("CART_CHANGED", "Some items in your bag have changed. Please review it.", {
          quote: toQuoteDTO(quote),
        })
      }
      if (input.couponCode && !quote.coupon) {
        throw conflict("COUPON_INVALID", quote.couponError ?? "This code is not valid.", { quote: toQuoteDTO(quote) })
      }
      if (quote.total !== input.expectedTotal) {
        throw conflict("PRICE_CHANGED", "Prices have changed since you started checkout. Please review your order.", {
          quote: toQuoteDTO(quote),
        })
      }

      for (const line of quote.lines) {
        const result = await Product.updateOne(
          { _id: line.product.id, status: "active", stock: { $gte: line.quantity } },
          { $inc: { stock: -line.quantity } },
          { session },
        )
        if (result.modifiedCount !== 1) {
          throw conflict("OUT_OF_STOCK", `Sorry, ${line.product.name} just sold out.`, { productId: line.product.id })
        }
      }

      if (quote.coupon) {
        const claimed = await Coupon.updateOne(
          {
            _id: quote.coupon.id,
            isActive: true,
            $or: [
              { usageLimit: { $exists: false } },
              { usageLimit: null },
              { $expr: { $lt: ["$usedCount", "$usageLimit"] } },
            ],
          },
          { $inc: { usedCount: 1 } },
          { session },
        )
        if (claimed.modifiedCount !== 1) {
          throw conflict("COUPON_INVALID", "This code has reached its usage limit.")
        }
      }

      const [order] = await Order.create(
        [
          {
            orderNumber: generateOrderNumber(),
            user: options.userId ?? undefined,
            customer: input.customer,
            shippingAddress: input.shippingAddress,
            items: quote.lines.map((l) => ({
              product: l.product.id,
              name: l.product.name,
              slug: l.product.slug,
              sku: l.product.sku,
              image: l.product.image?.url,
              unitPrice: l.unitPrice,
              quantity: l.quantity,
              discount: l.discount,
              lineTotal: l.lineTotal,
            })),
            currency: quote.currency,
            subtotal: quote.subtotal,
            discountTotal: quote.discountTotal,
            shippingTotal: quote.shippingTotal,
            total: quote.total,
            coupon: quote.coupon
              ? { code: quote.coupon.code, type: quote.coupon.type, value: quote.coupon.value, discount: quote.coupon.discount }
              : undefined,
            status: "pending",
            paymentStatus: "unpaid",
            notes: input.notes,
            statusHistory: [{ status: "pending", at: new Date() }],
            accessTokenHash: hashToken(accessToken, options.secret),
          },
        ],
        { session },
      )
      created = order!.toObject()
    })
    if (!created) throw new Error("Order transaction finished without an order")
    return { order: toOrderDTO(created), accessToken }
  } catch (error) {
    if (isDuplicateKey(error)) {
      // Order-number collision (astronomically rare): ask the client to retry.
      throw createError({ statusCode: 503, statusMessage: "Please try placing your order again." })
    }
    throw error
  } finally {
    await session.endSession()
  }
}

/* --------------------------------- Viewing --------------------------------- */

function tokensMatch(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/**
 * Returns an order if the viewer may see it: the signed-in owner, or anyone
 * holding the confirmation token. Otherwise 404 (not 403), so order numbers
 * can't be probed.
 */
export async function getOrderForViewer(
  orderNumber: string,
  viewer: { userId?: Types.ObjectId | null; token?: string | null; secret: string },
): Promise<OrderDTO> {
  const order = await Order.findOne({ orderNumber }).select("+accessTokenHash").lean()
  const notFound = createError({ statusCode: 404, statusMessage: "Order not found" })
  if (!order) throw notFound

  const isOwner = Boolean(viewer.userId && order.user && order.user.equals(viewer.userId))
  const hasToken = Boolean(viewer.token && tokensMatch(hashToken(viewer.token, viewer.secret), order.accessTokenHash))
  if (!isOwner && !hasToken) throw notFound
  return toOrderDTO(order)
}

export async function listUserOrders(
  userId: Types.ObjectId,
  page: number,
  limit: number,
): Promise<Paginated<OrderSummaryDTO>> {
  const filter = { user: userId }
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
  ])
  return { items: items.map(toOrderSummary), page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
}

/* ---------------------------------- Admin ---------------------------------- */

export async function listOrders(query: AdminOrderListQuery): Promise<Paginated<OrderSummaryDTO>> {
  const filter: QueryFilter<IOrder> = {}
  if (query.status) filter.status = query.status
  if (query.q) {
    const pattern = new RegExp(escapeRegex(query.q), "i")
    filter.$or = [{ orderNumber: pattern }, { "customer.email": pattern }, { "customer.name": pattern }]
  }
  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Order.countDocuments(filter),
  ])
  return {
    items: items.map(toOrderSummary),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  }
}

export async function getOrderById(id: string): Promise<OrderDTO> {
  const order = await Order.findById(id).lean()
  if (!order) throw createError({ statusCode: 404, statusMessage: "Order not found" })
  return toOrderDTO(order)
}

/**
 * Moves an order along its fulfillment lifecycle. Cancelling returns stock and
 * releases the coupon use in the same transaction. The status update is
 * conditional on the current status, so two admins can't apply conflicting changes.
 * Payment status is never changed here.
 */
export async function updateOrderStatus(
  id: string,
  next: OrderStatus,
  actor: { adminId: Types.ObjectId; note?: string },
): Promise<OrderDTO> {
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(id).session(session).lean()
      if (!order) throw createError({ statusCode: 404, statusMessage: "Order not found" })
      if (!canTransition(order.status, next)) {
        throw createError({ statusCode: 409, statusMessage: `An order that is ${order.status} cannot become ${next}.` })
      }

      const updated = await Order.updateOne(
        { _id: order._id, status: order.status },
        {
          $set: { status: next },
          $push: { statusHistory: { status: next, at: new Date(), by: actor.adminId, note: actor.note } },
        },
        { session },
      )
      if (updated.modifiedCount !== 1) {
        throw createError({ statusCode: 409, statusMessage: "The order was changed by someone else. Reload and try again." })
      }

      if (next === "cancelled") {
        for (const item of order.items) {
          await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }, { session })
        }
        if (order.coupon) {
          await Coupon.updateOne(
            { code: order.coupon.code, usedCount: { $gt: 0 } },
            { $inc: { usedCount: -1 } },
            { session },
          )
        }
      }
    })
  } finally {
    await session.endSession()
  }
  return getOrderById(id)
}
