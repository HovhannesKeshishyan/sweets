import { describe, expect, it } from 'vitest'
import { Coupon, Order, Product, User } from '../../server/db/models'
import { quoteCart } from '../../server/services/cart.service'
import { getOrderForViewer, placeOrder, updateOrderStatus } from '../../server/services/order.service'
import type { ResolvedSettings } from '../../server/services/settings.service'
import { checkoutSchema, type CheckoutInput } from '../../shared/schemas/cart'
import { hasDatabase, useTestDatabase } from '../setup/db'

const SECRET = 'k'.repeat(40)
const settings: ResolvedSettings = {
  storeName: 'Test',
  currency: 'USD',
  shipping: { flatRate: 700, freeShippingThreshold: 7500, allowedCountries: [] },
}

async function makeProduct(extra: Record<string, unknown> = {}) {
  const n = Math.random().toString(36).slice(2, 8)
  return Product.create({ name: `Truffle ${n}`, slug: `truffle-${n}`, description: 'd', price: 1250, stock: 10, status: 'active', ...extra })
}

function checkout(items: { productId: string; quantity: number }[], expectedTotal: number, extra: Partial<CheckoutInput> = {}) {
  return checkoutSchema.parse({
    items,
    customer: { email: 'guest@example.com', name: 'Guest Shopper' },
    shippingAddress: { line1: '1 Cocoa Lane', city: 'Paris', postalCode: '75001', country: 'FR' },
    expectedTotal,
    ...extra,
  })
}

describe.skipIf(!hasDatabase)('checkout', () => {
  useTestDatabase()

  it('creates an unpaid order with server prices and decrements stock', async () => {
    const p = await makeProduct()
    const { order, accessToken } = await placeOrder(checkout([{ productId: String(p._id), quantity: 2 }], 2500 + 700), settings, {
      secret: SECRET,
    })
    expect(order).toMatchObject({ status: 'pending', paymentStatus: 'unpaid', subtotal: 2500, shippingTotal: 700, total: 3200, isGuest: true })
    expect(order.orderNumber).toMatch(/^MC-\d{6}-[A-Z0-9]{6}$/)
    expect(accessToken.length).toBeGreaterThan(30)
    expect((await Product.findById(p._id))!.stock).toBe(8)
  })

  it('snapshots line items so later product edits do not change the order', async () => {
    const p = await makeProduct()
    const { order } = await placeOrder(checkout([{ productId: String(p._id), quantity: 1 }], 1950), settings, { secret: SECRET })
    await Product.updateOne({ _id: p._id }, { name: 'Renamed', price: 9999 })
    const stored = await Order.findById(order.id).lean()
    expect(stored!.items[0]).toMatchObject({ name: p.name, unitPrice: 1250, quantity: 1, lineTotal: 1250 })
  })

  it('refuses when the total the customer saw differs from server pricing', async () => {
    const p = await makeProduct()
    await expect(
      placeOrder(checkout([{ productId: String(p._id), quantity: 1 }], 1), settings, { secret: SECRET }),
    ).rejects.toMatchObject({ statusCode: 409, data: { code: 'PRICE_CHANGED' } })
    expect((await Product.findById(p._id))!.stock).toBe(10)
    expect(await Order.countDocuments()).toBe(0)
  })

  it('refuses unavailable products and over-stock quantities without side effects', async () => {
    const archived = await makeProduct({ status: 'archived' })
    await expect(
      placeOrder(checkout([{ productId: String(archived._id), quantity: 1 }], 1950), settings, { secret: SECRET }),
    ).rejects.toMatchObject({ statusCode: 409, data: { code: 'CART_CHANGED' } })

    const scarce = await makeProduct({ stock: 1 })
    await expect(
      placeOrder(checkout([{ productId: String(scarce._id), quantity: 2 }], 3200), settings, { secret: SECRET }),
    ).rejects.toMatchObject({ statusCode: 409 })
    expect((await Product.findById(scarce._id))!.stock).toBe(1)
  })

  it('never oversells under concurrent checkouts', async () => {
    const p = await makeProduct({ stock: 3 })
    const attempts = Array.from({ length: 8 }, () =>
      placeOrder(checkout([{ productId: String(p._id), quantity: 1 }], 1950), settings, { secret: SECRET }),
    )
    const results = await Promise.allSettled(attempts)
    const succeeded = results.filter((r) => r.status === 'fulfilled')
    expect(succeeded).toHaveLength(3)
    for (const r of results) {
      if (r.status === 'rejected') expect((r.reason as { statusCode: number }).statusCode).toBe(409)
    }
    expect((await Product.findById(p._id))!.stock).toBe(0)
    expect(await Order.countDocuments()).toBe(3)
  })

  it('never exceeds a coupon usage limit under concurrent checkouts', async () => {
    const p = await makeProduct({ stock: 100 })
    await Coupon.create({ code: 'ONCE2', type: 'fixed', value: 500, usageLimit: 2 })
    const expected = 1250 - 500 + 700
    const attempts = Array.from({ length: 6 }, () =>
      placeOrder(checkout([{ productId: String(p._id), quantity: 1 }], expected, { couponCode: 'once2' }), settings, {
        secret: SECRET,
      }),
    )
    const results = await Promise.allSettled(attempts)
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2)
    expect((await Coupon.findOne({ code: 'ONCE2' }))!.usedCount).toBe(2)
    // Failed attempts rolled back their stock decrement too.
    expect((await Product.findById(p._id))!.stock).toBe(98)
  })

  it('rejects an expired coupon at checkout', async () => {
    const p = await makeProduct()
    await Coupon.create({ code: 'OLD', type: 'percentage', value: 10, expiresAt: new Date(Date.now() - 1000) })
    await expect(
      placeOrder(checkout([{ productId: String(p._id), quantity: 1 }], 1825, { couponCode: 'OLD' }), settings, { secret: SECRET }),
    ).rejects.toMatchObject({ statusCode: 409, data: { code: 'COUPON_INVALID' } })
  })

  it('applies category-restricted coupons only to matching lines', async () => {
    const { Category } = await import('../../server/db/models')
    const gifts = await Category.create({ name: 'Gifts', slug: 'gifts' })
    const giftBox = await makeProduct({ price: 5000, category: gifts._id })
    const bar = await makeProduct({ price: 1000 })
    await Coupon.create({ code: 'GIFT10', type: 'percentage', value: 10, categories: [gifts._id] })
    const quote = await quoteCart(
      { items: [{ productId: String(giftBox._id), quantity: 1 }, { productId: String(bar._id), quantity: 1 }], couponCode: 'GIFT10' },
      settings,
    )
    expect(quote.discountTotal).toBe(500)
    expect(quote.lines.find((l) => l.product.id === String(bar._id))!.discount).toBe(0)
  })

  it('restricts shipping to allowed countries', async () => {
    const p = await makeProduct()
    await expect(
      placeOrder(checkout([{ productId: String(p._id), quantity: 1 }], 1950), { ...settings, shipping: { ...settings.shipping, allowedCountries: ['US'] } }, { secret: SECRET }),
    ).rejects.toMatchObject({ statusCode: 422 })
  })
})

describe.skipIf(!hasDatabase)('order access and fulfillment', () => {
  useTestDatabase()

  it('shows guest orders only with the confirmation token, owners without it', async () => {
    const owner = await User.create({ email: 'o@example.com', name: 'O', passwordHash: 'x' })
    const p = await makeProduct()
    const { order, accessToken } = await placeOrder(checkout([{ productId: String(p._id), quantity: 1 }], 1950), settings, {
      secret: SECRET,
      userId: owner._id,
    })
    expect((await getOrderForViewer(order.orderNumber, { token: accessToken, secret: SECRET })).id).toBe(order.id)
    expect((await getOrderForViewer(order.orderNumber, { userId: owner._id, secret: SECRET })).id).toBe(order.id)

    const stranger = await User.create({ email: 's@example.com', name: 'S', passwordHash: 'x' })
    await expect(getOrderForViewer(order.orderNumber, { userId: stranger._id, secret: SECRET })).rejects.toMatchObject({ statusCode: 404 })
    await expect(getOrderForViewer(order.orderNumber, { token: 'wrong', secret: SECRET })).rejects.toMatchObject({ statusCode: 404 })
    await expect(getOrderForViewer(order.orderNumber, { secret: SECRET })).rejects.toMatchObject({ statusCode: 404 })
  })

  it('follows allowed transitions and never touches payment status', async () => {
    const admin = await User.create({ email: 'a@example.com', name: 'A', passwordHash: 'x', role: 'admin' })
    const p = await makeProduct()
    const { order } = await placeOrder(checkout([{ productId: String(p._id), quantity: 1 }], 1950), settings, { secret: SECRET })

    await expect(updateOrderStatus(order.id, 'delivered', { adminId: admin._id })).rejects.toMatchObject({ statusCode: 409 })
    const processing = await updateOrderStatus(order.id, 'processing', { adminId: admin._id, note: 'Packing' })
    expect(processing.status).toBe('processing')
    expect(processing.statusHistory.map((h) => h.status)).toEqual(['pending', 'processing'])
    expect(processing.paymentStatus).toBe('unpaid')
  })

  it('returns stock and releases the coupon use when cancelled', async () => {
    const admin = await User.create({ email: 'a2@example.com', name: 'A', passwordHash: 'x', role: 'admin' })
    const p = await makeProduct({ stock: 5 })
    await Coupon.create({ code: 'BACK', type: 'fixed', value: 100, usageLimit: 1 })
    const { order } = await placeOrder(
      checkout([{ productId: String(p._id), quantity: 2 }], 2500 - 100 + 700, { couponCode: 'BACK' }),
      settings,
      { secret: SECRET },
    )
    expect((await Product.findById(p._id))!.stock).toBe(3)

    const cancelled = await updateOrderStatus(order.id, 'cancelled', { adminId: admin._id })
    expect(cancelled.status).toBe('cancelled')
    expect((await Product.findById(p._id))!.stock).toBe(5)
    expect((await Coupon.findOne({ code: 'BACK' }))!.usedCount).toBe(0)
    await expect(updateOrderStatus(order.id, 'processing', { adminId: admin._id })).rejects.toMatchObject({ statusCode: 409 })
  })
})
