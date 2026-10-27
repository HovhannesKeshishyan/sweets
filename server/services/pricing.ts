/**
 * Pure pricing engine: cart lines + current products + coupon + shipping rules
 * → priced quote. No I/O, so it is deterministic and unit-testable. The cart
 * preview and order placement both call it, with prices read from the database,
 * never from the client.
 */
import { MAX_QUANTITY_PER_LINE } from "../../shared/constants";
import type { CouponType } from "../../shared/constants";
import type {
  CartIssueCode,
  CartLineInput,
  ImageDTO,
} from "../../shared/types/api";
import { formatMoney, percentOf } from "../../shared/utils/money";

export interface PricingProduct {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  price: number;
  stock: number;
  status: string;
  categoryId: string | null;
  image: ImageDTO | null;
}

export interface PricingCoupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  minOrderAmount: number;
  maxDiscountAmount?: number | null;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  usageLimit?: number | null;
  usedCount: number;
  productIds: string[];
  categoryIds: string[];
  isActive: boolean;
}

export interface ShippingRules {
  flatRate: number;
  freeShippingThreshold?: number | null;
}

export interface PricedLine {
  product: PricingProduct;
  quantity: number;
  unitPrice: number;
  /** unitPrice × quantity, before discount. */
  gross: number;
  discount: number;
  lineTotal: number;
}

export interface QuoteIssue {
  productId: string;
  code: CartIssueCode;
  message: string;
}

export interface Quote {
  currency: string;
  lines: PricedLine[];
  issues: QuoteIssue[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  total: number;
  coupon: {
    id: string;
    code: string;
    type: CouponType;
    value: number;
    discount: number;
  } | null;
  couponError: string | null;
  freeShippingRemaining: number | null;
}

/** Merges duplicate product lines and drops non-positive quantities. */
export function normalizeLines(lines: CartLineInput[]): CartLineInput[] {
  const merged = new Map<string, number>();
  for (const line of lines) {
    if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) continue;
    merged.set(
      line.productId,
      (merged.get(line.productId) ?? 0) + line.quantity,
    );
  }
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
}

/**
 * Splits `total` across `weights` proportionally, in whole units, so the parts
 * always sum exactly to `total` (largest-remainder method).
 */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (total <= 0 || sum <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (total * w) / sum);
  const parts = exact.map(Math.floor);
  let remainder = total - parts.reduce((a, b) => a + b, 0);
  const order = exact
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac || a.index - b.index);
  for (const { index } of order) {
    if (remainder <= 0) break;
    parts[index]! += 1;
    remainder -= 1;
  }
  return parts;
}

export type CouponEvaluation =
  | { ok: true; discount: number; perLine: number[] }
  | { ok: false; reason: string };

/** Checks a coupon against priced lines and computes the discount per line. */
export function evaluateCoupon(
  coupon: PricingCoupon,
  lines: Pick<PricedLine, "product" | "gross">[],
  currency: string,
  now: Date,
): CouponEvaluation {
  if (!coupon.isActive) return { ok: false, reason: "This code is not valid." };
  if (coupon.startsAt && coupon.startsAt > now)
    return { ok: false, reason: "This code is not active yet." };
  if (coupon.expiresAt && coupon.expiresAt <= now)
    return { ok: false, reason: "This code has expired." };
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, reason: "This code has reached its usage limit." };
  }

  const subtotal = lines.reduce((sum, l) => sum + l.gross, 0);
  if (subtotal < coupon.minOrderAmount) {
    const missing = formatMoney(coupon.minOrderAmount - subtotal, currency);
    return { ok: false, reason: `Add ${missing} more to use this code.` };
  }

  const restricted =
    coupon.productIds.length > 0 || coupon.categoryIds.length > 0;
  const eligible = lines.map(
    (l) =>
      !restricted ||
      coupon.productIds.includes(l.product.id) ||
      (l.product.categoryId !== null &&
        coupon.categoryIds.includes(l.product.categoryId)),
  );
  const eligibleGross = lines.map((l, i) => (eligible[i] ? l.gross : 0));
  const eligibleSubtotal = eligibleGross.reduce((a, b) => a + b, 0);
  if (eligibleSubtotal === 0)
    return {
      ok: false,
      reason: "This code doesn't apply to the items in your bag.",
    };

  let discount =
    coupon.type === "percentage"
      ? percentOf(eligibleSubtotal, Math.min(coupon.value, 100))
      : Math.min(coupon.value, eligibleSubtotal);
  if (coupon.maxDiscountAmount != null)
    discount = Math.min(discount, coupon.maxDiscountAmount);

  return { ok: true, discount, perLine: allocate(discount, eligibleGross) };
}

export interface QuoteInput {
  lines: CartLineInput[];
  products: Map<string, PricingProduct>;
  currency: string;
  shipping: ShippingRules;
  coupon?: PricingCoupon | null;
  /** The code the customer typed; used for the "not found" message. */
  couponCode?: string | null;
  now?: Date;
}

export function buildQuote(input: QuoteInput): Quote {
  const now = input.now ?? new Date();
  const issues: QuoteIssue[] = [];
  const priced: PricedLine[] = [];

  for (const line of normalizeLines(input.lines)) {
    const product = input.products.get(line.productId);
    if (!product || product.status !== "active") {
      issues.push({
        productId: line.productId,
        code: "unavailable",
        message: "This item is no longer available.",
      });
      continue;
    }
    const max = Math.min(product.stock, MAX_QUANTITY_PER_LINE);
    if (max <= 0) {
      issues.push({
        productId: product.id,
        code: "unavailable",
        message: `${product.name} is sold out.`,
      });
      continue;
    }
    let quantity = line.quantity;
    if (quantity > max) {
      quantity = max;
      issues.push({
        productId: product.id,
        code:
          product.stock < line.quantity
            ? "insufficient_stock"
            : "quantity_adjusted",
        message:
          product.stock < line.quantity
            ? `Only ${product.stock} of ${product.name} available.`
            : `You can order up to ${MAX_QUANTITY_PER_LINE} of ${product.name}.`,
      });
    }
    const gross = product.price * quantity;
    priced.push({
      product,
      quantity,
      unitPrice: product.price,
      gross,
      discount: 0,
      lineTotal: gross,
    });
  }

  const subtotal = priced.reduce((sum, l) => sum + l.gross, 0);

  let coupon: Quote["coupon"] = null;
  let couponError: string | null = null;
  if (input.coupon) {
    const result = evaluateCoupon(input.coupon, priced, input.currency, now);
    if (result.ok) {
      priced.forEach((line, i) => {
        line.discount = result.perLine[i] ?? 0;
        line.lineTotal = line.gross - line.discount;
      });
      coupon = {
        id: input.coupon.id,
        code: input.coupon.code,
        type: input.coupon.type,
        value: input.coupon.value,
        discount: result.discount,
      };
    } else {
      couponError = result.reason;
    }
  } else if (input.couponCode) {
    couponError = "This code is not valid.";
  }

  const discountTotal = coupon?.discount ?? 0;
  const afterDiscount = subtotal - discountTotal;
  const threshold = input.shipping.freeShippingThreshold ?? null;
  const qualifiesForFree = threshold !== null && afterDiscount >= threshold;
  const shippingTotal =
    priced.length === 0 || qualifiesForFree ? 0 : input.shipping.flatRate;

  return {
    currency: input.currency,
    lines: priced,
    issues,
    subtotal,
    discountTotal,
    shippingTotal,
    total: afterDiscount + shippingTotal,
    coupon,
    couponError,
    freeShippingRemaining:
      threshold === null || priced.length === 0
        ? null
        : Math.max(0, threshold - afterDiscount),
  };
}
