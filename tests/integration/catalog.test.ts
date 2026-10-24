import { describe, expect, it } from 'vitest'
import { Category, Product } from '../../server/db/models'
import { createCategory, deleteCategory, listPublicCategories, updateCategory } from '../../server/services/category.service'
import { createCoupon, updateCoupon } from '../../server/services/coupon.service'
import {
  archiveProduct,
  createProduct,
  getPublicProductBySlug,
  listAdminProducts,
  listPublicProducts,
  updateProduct,
} from '../../server/services/product.service'
import { getStoreSettings, updateStoreSettings } from '../../server/services/settings.service'
import { productInputSchema, productListQuerySchema } from '../../shared/schemas/catalog'
import { couponInputSchema } from '../../shared/schemas/coupon'
import { hasDatabase, useTestDatabase } from '../setup/db'

const list = (q: Record<string, string> = {}) => listPublicProducts(productListQuerySchema.parse(q))

describe.skipIf(!hasDatabase)('catalog services', () => {
  useTestDatabase()

  async function seed() {
    const bars = await createCategory({ name: 'Bars', sortOrder: 1, isActive: true })
    const hidden = await createCategory({ name: 'Hidden', sortOrder: 2, isActive: false })
    const make = (input: Record<string, unknown>) => createProduct(productInputSchema.parse({ description: 'd', status: 'active', ...input }))
    await make({ name: 'Dark Bar', price: 1100, category: bars.id, isFeatured: true, tags: ['vegan'] })
    await make({ name: 'Milk Bar', price: 900, category: bars.id, compareAtPrice: 1200 })
    await make({ name: 'Gift Box', price: 5000, tags: ['gift'] })
    await make({ name: 'Draft Thing', price: 100, status: 'draft' })
    await make({ name: 'Secret Bar', price: 100, category: hidden.id })
    return { bars, hidden }
  }

  it('lists only active products and supports filters, search and sorting', async () => {
    await seed()
    expect((await list()).items.map((p) => p.name)).not.toContain('Draft Thing')
    expect((await list({ category: 'bars' })).total).toBe(2)
    expect((await list({ category: 'hidden' })).total).toBe(0)
    expect((await list({ tag: 'gift' })).items.map((p) => p.name)).toEqual(['Gift Box'])
    expect((await list({ onSale: 'true' })).items.map((p) => p.name)).toEqual(['Milk Bar'])
    expect((await list({ q: 'dark' })).items.map((p) => p.name)).toEqual(['Dark Bar'])
    expect((await list({ q: '.*' })).total).toBe(0) // regex characters are escaped
    expect((await list({ sort: 'price-asc' })).items[0]!.price).toBe(100)
    expect((await list({ sort: 'featured' })).items[0]!.name).toBe('Dark Bar')
  })

  it('paginates', async () => {
    await seed()
    const page1 = await list({ limit: '2', sort: 'name' })
    const page2 = await list({ limit: '2', page: '2', sort: 'name' })
    expect(page1).toMatchObject({ total: 4, totalPages: 2 })
    expect(page2.items.map((p) => p.name)).not.toEqual(page1.items.map((p) => p.name))
  })

  it('generates slugs, rejects duplicates and validates categories', async () => {
    const p = await createProduct(productInputSchema.parse({ name: 'Crème Brûlée Bonbon', description: 'd', price: 300 }))
    expect(p.slug).toBe('creme-brulee-bonbon')
    await expect(createProduct(productInputSchema.parse({ name: 'Crème Brûlée Bonbon', description: 'd', price: 300 }))).rejects.toMatchObject({ statusCode: 409 })
    await expect(
      createProduct(productInputSchema.parse({ name: 'X', description: 'd', price: 300, category: '64b7f0c2a1b2c3d4e5f60718' })),
    ).rejects.toMatchObject({ statusCode: 422 })
  })

  it('updates partially and checks compare-at price against the stored price', async () => {
    const p = await createProduct(productInputSchema.parse({ name: 'Bar', description: 'd', price: 1000, stock: 7 }))
    const updated = await updateProduct(p.id, { price: 1100 })
    expect(updated).toMatchObject({ price: 1100, stock: 7, status: 'draft' })
    await expect(updateProduct(p.id, { compareAtPrice: 500 })).rejects.toMatchObject({ statusCode: 422 })
  })

  it('archives instead of deleting, hiding the product from the shop', async () => {
    const p = await createProduct(productInputSchema.parse({ name: 'Old', description: 'd', price: 100, status: 'active', isFeatured: true }))
    const archived = await archiveProduct(p.id)
    expect(archived).toMatchObject({ status: 'archived', isFeatured: false })
    expect(await Product.countDocuments()).toBe(1)
    expect(await getPublicProductBySlug('old')).toBeNull()
    expect((await listAdminProducts({ page: 1, limit: 20, status: 'archived' })).total).toBe(1)
  })

  it('hides inactive categories and protects categories that have products', async () => {
    const { bars, hidden } = await seed()
    expect((await listPublicCategories()).map((c) => c.slug)).toEqual(['bars'])
    await expect(deleteCategory(bars.id)).rejects.toMatchObject({ statusCode: 409 })
    await Product.deleteMany({ category: hidden.id })
    await deleteCategory(hidden.id)
    expect(await Category.countDocuments()).toBe(1)
    expect((await updateCategory(bars.id, { name: 'Chocolate Bars' })).slug).toBe('bars')
  })

  it('creates coupons, prevents duplicate codes and clears limits with null', async () => {
    const c = await createCoupon(couponInputSchema.parse({ code: 'save20', type: 'percentage', value: 20, usageLimit: 5 }))
    expect(c).toMatchObject({ code: 'SAVE20', usageLimit: 5, usedCount: 0 })
    await expect(createCoupon(couponInputSchema.parse({ code: 'SAVE20', type: 'fixed', value: 1 }))).rejects.toMatchObject({ statusCode: 409 })
    expect((await updateCoupon(c.id, { usageLimit: null })).usageLimit).toBeNull()
    await expect(updateCoupon(c.id, { value: 150 })).rejects.toMatchObject({ statusCode: 422 })
  })

  it('falls back to env defaults and persists settings updates', async () => {
    const defaults = { storeName: 'Env Store', currency: 'USD' }
    expect(await getStoreSettings(defaults)).toMatchObject({ storeName: 'Env Store', currency: 'USD', shipping: { flatRate: 0 } })
    await updateStoreSettings({ shipping: { flatRate: 500, freeShippingThreshold: 5000, allowedCountries: ['US'] } }, defaults)
    expect(await getStoreSettings(defaults)).toMatchObject({ storeName: 'Env Store', shipping: { flatRate: 500, freeShippingThreshold: 5000 } })
    await updateStoreSettings({ currency: 'EUR', shipping: { flatRate: 0, freeShippingThreshold: null, allowedCountries: [] } }, defaults)
    const s = await getStoreSettings(defaults)
    expect(s.currency).toBe('EUR')
    expect(s.shipping.freeShippingThreshold).toBeUndefined()
  })
})
