import { describe, expect, it } from "vitest";
import {
  allocate,
  buildQuote,
  evaluateCoupon,
  normalizeLines,
  type PricingCoupon,
  type PricingProduct,
} from "../../server/services/pricing";

const now = new Date("2026-10-24T12:00:00Z");

function product(
  id: string,
  price: number,
  extra: Partial<PricingProduct> = {},
): PricingProduct {
  return {
    id,
    name: `Product ${id}`,
    slug: `p-${id}`,
    price,
    stock: 50,
    status: "active",
    categoryId: "cat-a",
    image: null,
    ...extra,
  };
}

function coupon(extra: Partial<PricingCoupon> = {}): PricingCoupon {
  return {
    id: "c1",
    code: "SWEET",
    type: "percentage",
    value: 10,
    minOrderAmount: 0,
    usedCount: 0,
    productIds: [],
    categoryIds: [],
    isActive: true,
    ...extra,
  };
}

const catalog = new Map([
  ["a", product("a", 1250)], // $12.50
  ["b", product("b", 899, { categoryId: "cat-b" })], // $8.99
  ["c", product("c", 3000, { stock: 2 })],
]);

const shipping = { flatRate: 700, freeShippingThreshold: 7500 };

function quote(
  lines: { productId: string; quantity: number }[],
  extra: Partial<Parameters<typeof buildQuote>[0]> = {},
) {
  return buildQuote({
    lines,
    products: catalog,
    currency: "USD",
    shipping,
    now,
    ...extra,
  });
}

describe("allocate", () => {
  it("splits exactly, never losing or inventing a cent", () => {
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(allocate(10, [3, 0, 7])).toEqual([3, 0, 7]);
    expect(allocate(0, [5, 5])).toEqual([0, 0]);
    expect(allocate(5, [0, 0])).toEqual([0, 0]);
    for (const [total, weights] of [
      [999, [1250, 899, 3000]],
      [1, [1, 1, 1, 1]],
      [12345, [7, 13, 29, 1]],
    ] as const) {
      expect(allocate(total, [...weights]).reduce((a, b) => a + b, 0)).toBe(
        total,
      );
    }
  });
});

describe("normalizeLines", () => {
  it("merges duplicates and drops invalid quantities", () => {
    expect(
      normalizeLines([
        { productId: "a", quantity: 1 },
        { productId: "a", quantity: 2 },
        { productId: "b", quantity: 0 },
        { productId: "c", quantity: 1.5 },
      ]),
    ).toEqual([{ productId: "a", quantity: 3 }]);
  });
});

describe("buildQuote", () => {
  it("prices lines from product data, not client input", () => {
    const q = quote([
      { productId: "a", quantity: 2 },
      { productId: "b", quantity: 1 },
    ]);
    expect(q.subtotal).toBe(1250 * 2 + 899);
    expect(q.lines.map((l) => l.lineTotal)).toEqual([2500, 899]);
    expect(q.shippingTotal).toBe(700);
    expect(q.total).toBe(3399 + 700);
    expect(q.issues).toEqual([]);
  });

  it("gives free shipping at the threshold and reports what remains", () => {
    expect(quote([{ productId: "a", quantity: 6 }]).shippingTotal).toBe(0); // 7500
    const below = quote([{ productId: "a", quantity: 5 }]); // 6250
    expect(below.shippingTotal).toBe(700);
    expect(below.freeShippingRemaining).toBe(1250);
  });

  it("charges nothing for an empty cart", () => {
    const q = quote([]);
    expect(q).toMatchObject({
      subtotal: 0,
      shippingTotal: 0,
      total: 0,
      freeShippingRemaining: null,
    });
  });

  it("flags unavailable, sold-out and over-stock lines", () => {
    const products = new Map(catalog);
    products.set("d", product("d", 500, { status: "archived" }));
    products.set("e", product("e", 500, { stock: 0 }));
    const q = quote(
      [
        { productId: "missing", quantity: 1 },
        { productId: "d", quantity: 1 },
        { productId: "e", quantity: 1 },
        { productId: "c", quantity: 5 },
      ],
      { products },
    );
    expect(q.issues.map((i) => [i.productId, i.code])).toEqual([
      ["missing", "unavailable"],
      ["d", "unavailable"],
      ["e", "unavailable"],
      ["c", "insufficient_stock"],
    ]);
    expect(q.lines).toHaveLength(1);
    expect(q.lines[0]!.quantity).toBe(2);
  });

  it("caps quantity per line", () => {
    const q = quote([{ productId: "a", quantity: 25 }]);
    expect(q.lines[0]!.quantity).toBe(20);
    expect(q.issues[0]!.code).toBe("quantity_adjusted");
  });

  it("applies a percentage coupon and allocates it across lines", () => {
    const q = quote(
      [
        { productId: "a", quantity: 1 },
        { productId: "b", quantity: 1 },
      ],
      { coupon: coupon({ value: 15 }) },
    );
    const expected = Math.round((1250 + 899) * 0.15); // 322
    expect(q.discountTotal).toBe(expected);
    expect(q.lines.reduce((s, l) => s + l.discount, 0)).toBe(expected);
    expect(q.lines.reduce((s, l) => s + l.lineTotal, 0)).toBe(
      1250 + 899 - expected,
    );
    expect(q.total).toBe(1250 + 899 - expected + 700);
    expect(q.coupon?.code).toBe("SWEET");
  });

  it("uses the discounted subtotal for the free-shipping threshold", () => {
    const q = quote([{ productId: "a", quantity: 6 }], {
      coupon: coupon({ value: 10 }),
    }); // 7500 - 750
    expect(q.shippingTotal).toBe(700);
  });

  it("reports an unknown code without failing the quote", () => {
    const q = quote([{ productId: "a", quantity: 1 }], { couponCode: "NOPE" });
    expect(q.couponError).toBe("This code is not valid.");
    expect(q.discountTotal).toBe(0);
  });
});

describe("evaluateCoupon", () => {
  const lines = [
    { product: catalog.get("a")!, gross: 2500 },
    { product: catalog.get("b")!, gross: 899 },
  ];

  it("never discounts more than the eligible amount (fixed)", () => {
    const r = evaluateCoupon(
      coupon({ type: "fixed", value: 100_000 }),
      lines,
      "USD",
      now,
    );
    expect(r).toMatchObject({ ok: true, discount: 3399 });
  });

  it("applies fixed amounts and percentage caps", () => {
    expect(
      evaluateCoupon(coupon({ type: "fixed", value: 500 }), lines, "USD", now),
    ).toMatchObject({ discount: 500 });
    expect(
      evaluateCoupon(
        coupon({ value: 50, maxDiscountAmount: 1000 }),
        lines,
        "USD",
        now,
      ),
    ).toMatchObject({ discount: 1000 });
  });

  it("respects product and category restrictions", () => {
    const byProduct = evaluateCoupon(
      coupon({ value: 10, productIds: ["b"] }),
      lines,
      "USD",
      now,
    );
    expect(byProduct).toMatchObject({
      ok: true,
      discount: 90,
      perLine: [0, 90],
    });

    const byCategory = evaluateCoupon(
      coupon({ value: 10, categoryIds: ["cat-a"] }),
      lines,
      "USD",
      now,
    );
    expect(byCategory).toMatchObject({
      ok: true,
      discount: 250,
      perLine: [250, 0],
    });

    const none = evaluateCoupon(
      coupon({ categoryIds: ["cat-z"] }),
      lines,
      "USD",
      now,
    );
    expect(none).toMatchObject({ ok: false });
  });

  it("enforces activity, dates, usage limits and minimum spend", () => {
    const reason = (c: PricingCoupon) => {
      const r = evaluateCoupon(c, lines, "USD", now);
      return r.ok ? null : r.reason;
    };
    expect(reason(coupon({ isActive: false }))).toMatch(/not valid/);
    expect(reason(coupon({ startsAt: new Date("2026-11-01") }))).toMatch(
      /not active yet/,
    );
    expect(
      reason(coupon({ expiresAt: new Date("2026-10-24T12:00:00Z") })),
    ).toMatch(/expired/);
    expect(reason(coupon({ usageLimit: 5, usedCount: 5 }))).toMatch(
      /usage limit/,
    );
    expect(reason(coupon({ usageLimit: 5, usedCount: 4 }))).toBeNull();
    expect(reason(coupon({ minOrderAmount: 5000 }))).toBe(
      "Add $16.01 more to use this code.",
    );
    expect(reason(coupon({ minOrderAmount: 3399 }))).toBeNull();
  });

  it("never yields a negative or fractional discount", () => {
    for (const value of [1, 3, 7, 33, 99, 100]) {
      const r = evaluateCoupon(coupon({ value }), lines, "USD", now);
      if (!r.ok) throw new Error("expected ok");
      expect(Number.isInteger(r.discount)).toBe(true);
      expect(r.discount).toBeGreaterThanOrEqual(0);
      expect(r.discount).toBeLessThanOrEqual(3399);
      expect(r.perLine.reduce((a, b) => a + b, 0)).toBe(r.discount);
    }
  });
});
