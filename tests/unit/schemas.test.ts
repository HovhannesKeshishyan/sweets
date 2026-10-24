import { describe, expect, it } from "vitest"
import { loginSchema, profileUpdateSchema, registerSchema } from "../../shared/schemas/auth"
import { categoryUpdateSchema, productInputSchema, productUpdateSchema } from "../../shared/schemas/catalog"
import { couponInputSchema, couponUpdateSchema } from "../../shared/schemas/coupon"
import { storeSettingsUpdateSchema } from "../../shared/schemas/settings"

describe("auth schemas", () => {
  it("normalises email and drops a client-supplied role", () => {
    const parsed = registerSchema.parse({
      name: " Ana ",
      email: " Ana@Example.COM ",
      password: "long-enough-pw",
      role: "admin",
    })
    expect(parsed).toEqual({ name: "Ana", email: "ana@example.com", password: "long-enough-pw" })
  })

  it("enforces password length on register but not on login", () => {
    expect(registerSchema.safeParse({ name: "A", email: "a@b.co", password: "short" }).success).toBe(false)
    expect(loginSchema.safeParse({ email: "a@b.co", password: "short" }).success).toBe(true)
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x".repeat(129) }).success).toBe(false)
  })

  it("rejects operator objects in credentials", () => {
    expect(loginSchema.safeParse({ email: { $ne: "" }, password: "x" }).success).toBe(false)
    expect(loginSchema.safeParse({ email: "a@b.co", password: { $gt: "" } }).success).toBe(false)
  })

  it("does not let customers edit email or role via profile", () => {
    expect(profileUpdateSchema.parse({ name: "B", email: "x@y.z", role: "admin" })).toEqual({ name: "B" })
  })
})

describe("catalog schemas", () => {
  const valid = { name: "Dark Truffles", description: "Rich.", price: 1850 }

  it("applies defaults on create", () => {
    expect(productInputSchema.parse(valid)).toMatchObject({
      stock: 0,
      status: "draft",
      isFeatured: false,
      images: [],
      tags: [],
    })
  })

  it("never injects defaults into partial updates", () => {
    expect(productUpdateSchema.parse({ price: 2000 })).toEqual({ price: 2000 })
    expect(categoryUpdateSchema.parse({ name: "Bars" })).toEqual({ name: "Bars" })
  })

  it("requires integer minor-unit prices", () => {
    expect(productInputSchema.safeParse({ ...valid, price: 18.5 }).success).toBe(false)
    expect(productInputSchema.safeParse({ ...valid, price: 0 }).success).toBe(false)
    expect(productInputSchema.safeParse({ ...valid, price: "1850" }).success).toBe(false)
  })

  it("requires compare-at price above price", () => {
    expect(productInputSchema.safeParse({ ...valid, compareAtPrice: 1000 }).success).toBe(false)
    expect(productInputSchema.safeParse({ ...valid, compareAtPrice: 2500 }).success).toBe(true)
  })

  it("accepts only http(s) image URLs", () => {
    const img = (url: string) => productInputSchema.safeParse({ ...valid, images: [{ url }] }).success
    expect(img("https://res.cloudinary.com/demo/image/upload/truffle.jpg")).toBe(true)
    expect(img("javascript:alert(1)")).toBe(false)
    expect(img("data:image/png;base64,AAAA")).toBe(false)
  })

  it("validates slugs", () => {
    expect(productInputSchema.safeParse({ ...valid, slug: "dark-truffles" }).success).toBe(true)
    expect(productInputSchema.safeParse({ ...valid, slug: "Dark Truffles!" }).success).toBe(false)
  })
})

describe("coupon schemas", () => {
  it("uppercases codes and caps percentages at 100", () => {
    expect(couponInputSchema.parse({ code: "sweet10", type: "percentage", value: 10 }).code).toBe("SWEET10")
    expect(couponInputSchema.safeParse({ code: "BIG", type: "percentage", value: 150 }).success).toBe(false)
    expect(couponInputSchema.safeParse({ code: "BIG", type: "fixed", value: 15000 }).success).toBe(true)
  })

  it("requires expiry after start", () => {
    const base = { code: "DATE", type: "fixed", value: 500 }
    expect(
      couponInputSchema.safeParse({ ...base, startsAt: "2026-12-01", expiresAt: "2026-11-01" }).success,
    ).toBe(false)
    expect(
      couponInputSchema.safeParse({ ...base, startsAt: "2026-11-01", expiresAt: "2026-12-01" }).success,
    ).toBe(true)
  })

  it("allows clearing limits on update without resetting other fields", () => {
    expect(couponUpdateSchema.parse({ usageLimit: null })).toEqual({ usageLimit: null })
    expect(couponUpdateSchema.parse({ usedCount: 0 } as object)).toEqual({})
  })
})

describe("store settings schema", () => {
  it("validates currency codes", () => {
    expect(storeSettingsUpdateSchema.parse({ currency: "eur" })).toEqual({ currency: "EUR" })
    expect(storeSettingsUpdateSchema.safeParse({ currency: "XYZ1" }).success).toBe(false)
  })
})
