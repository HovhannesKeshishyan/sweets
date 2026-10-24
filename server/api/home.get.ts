import { listPublicCategories } from '../services/category.service'
import { listPublicProducts } from '../services/product.service'

/** Everything the homepage needs in one request. */
export default defineEventHandler(async () => {
  await useDatabase()
  const base = { sort: 'featured' as const, page: 1 }
  const [featured, gifts, onSale, categories] = await Promise.all([
    listPublicProducts({ ...base, featured: true, limit: 8 }),
    listPublicProducts({ ...base, tag: 'gift', limit: 4 }),
    listPublicProducts({ ...base, onSale: true, limit: 4 }),
    listPublicCategories(),
  ])
  return {
    featured: featured.items,
    gifts: gifts.items,
    onSale: onSale.items,
    categories: categories.filter((c) => (c.productCount ?? 0) > 0),
  }
})
