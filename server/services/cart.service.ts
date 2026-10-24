import { MAX_QUANTITY_PER_LINE } from '../../shared/constants'
import type { ClientSession } from 'mongoose'
import type { CartLineInput, QuoteDTO } from '../../shared/types/api'
import { Coupon, Product, type ICoupon } from '../db/models'
import { buildQuote, normalizeLines, type PricingCoupon, type PricingProduct, type Quote } from './pricing'
import type { ResolvedSettings } from './settings.service'

export async function loadPricingProducts(
  lines: CartLineInput[],
  session?: ClientSession,
): Promise<Map<string, PricingProduct>> {
  const ids = [...new Set(lines.map((l) => l.productId))]
  if (!ids.length) return new Map()
  const products = await Product.find({ _id: { $in: ids } })
    .select('name slug sku price stock status category images')
    .session(session ?? null)
    .lean()
  return new Map(
    products.map((p) => [
      String(p._id),
      {
        id: String(p._id),
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        price: p.price,
        stock: p.stock,
        status: p.status,
        categoryId: p.category ? String(p.category) : null,
        image: p.images[0] ? { url: p.images[0].url, alt: p.images[0].alt ?? '' } : null,
      },
    ]),
  )
}

export function toPricingCoupon(c: ICoupon): PricingCoupon {
  return {
    id: String(c._id),
    code: c.code,
    type: c.type,
    value: c.value,
    minOrderAmount: c.minOrderAmount,
    maxDiscountAmount: c.maxDiscountAmount ?? null,
    startsAt: c.startsAt ?? null,
    expiresAt: c.expiresAt ?? null,
    usageLimit: c.usageLimit ?? null,
    usedCount: c.usedCount,
    productIds: c.products.map(String),
    categoryIds: c.categories.map(String),
    isActive: c.isActive,
  }
}

export async function loadCoupon(code: string | undefined, session?: ClientSession) {
  if (!code) return null
  const coupon = await Coupon.findOne({ code: code.toUpperCase() })
    .session(session ?? null)
    .lean()
  return coupon ? toPricingCoupon(coupon) : null
}

export async function quoteCart(
  input: { items: CartLineInput[]; couponCode?: string },
  settings: ResolvedSettings,
  session?: ClientSession,
): Promise<Quote> {
  const lines = normalizeLines(input.items)
  // Operations in one transaction session must not run concurrently, so
  // load sequentially inside a transaction and in parallel otherwise.
  const [products, coupon] = session
    ? [await loadPricingProducts(lines, session), await loadCoupon(input.couponCode, session)]
    : await Promise.all([loadPricingProducts(lines), loadCoupon(input.couponCode)])
  return buildQuote({
    lines,
    products,
    currency: settings.currency,
    shipping: settings.shipping,
    coupon,
    couponCode: input.couponCode,
  })
}

export function toQuoteDTO(q: Quote): QuoteDTO {
  return {
    currency: q.currency,
    lines: q.lines.map((l) => ({
      productId: l.product.id,
      name: l.product.name,
      slug: l.product.slug,
      image: l.product.image,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      maxQuantity: Math.min(l.product.stock, MAX_QUANTITY_PER_LINE),
      discount: l.discount,
      lineTotal: l.lineTotal,
    })),
    issues: q.issues,
    subtotal: q.subtotal,
    discountTotal: q.discountTotal,
    shippingTotal: q.shippingTotal,
    total: q.total,
    coupon: q.coupon && { code: q.coupon.code, type: q.coupon.type, value: q.coupon.value, discount: q.coupon.discount },
    couponError: q.couponError,
    freeShippingRemaining: q.freeShippingRemaining,
  }
}
