import { createError } from 'h3'
import { Types, type QueryFilter } from 'mongoose'
import { LOW_STOCK_THRESHOLD, MAX_QUANTITY_PER_LINE } from '../../shared/constants'
import type {
  AdminProductListQuery,
  ProductInput,
  ProductListQuery,
  ProductUpdateInput,
} from '../../shared/schemas/catalog'
import type { Paginated } from '../../shared/schemas/common'
import type {
  AdminProductDTO,
  ImageDTO,
  ProductDetailDTO,
  ProductSummaryDTO,
  StockLevel,
} from '../../shared/types/api'
import { slugify } from '../../shared/utils/slug'
import { Category, Product, type ICategory, type ImageRef, type IProduct } from '../db/models'
import { escapeRegex, isDuplicateKey } from './errors'

type PopulatedProduct = Omit<IProduct, 'category'> & { category?: ICategory | Types.ObjectId | null }

export function stockLevel(stock: number): StockLevel {
  if (stock <= 0) return 'out_of_stock'
  return stock <= LOW_STOCK_THRESHOLD ? 'low_stock' : 'in_stock'
}

function toImage(img: ImageRef): ImageDTO {
  return { url: img.url, alt: img.alt ?? '', width: img.width, height: img.height }
}

function categoryRef(category: PopulatedProduct['category']) {
  return category && 'slug' in category ? { name: category.name, slug: category.slug } : null
}

export function toProductSummary(p: PopulatedProduct): ProductSummaryDTO {
  return {
    id: String(p._id),
    name: p.name,
    slug: p.slug,
    shortDescription: p.shortDescription ?? null,
    price: p.price,
    compareAtPrice: p.compareAtPrice ?? null,
    image: p.images[0] ? toImage(p.images[0]) : null,
    category: categoryRef(p.category),
    tags: p.tags,
    isFeatured: p.isFeatured,
    stockLevel: stockLevel(p.stock),
    maxQuantity: Math.max(0, Math.min(p.stock, MAX_QUANTITY_PER_LINE)),
  }
}

export function toProductDetail(p: PopulatedProduct): ProductDetailDTO {
  return {
    ...toProductSummary(p),
    description: p.description,
    images: p.images.map(toImage),
    ingredients: p.ingredients ?? null,
    allergens: p.allergens,
    weightGrams: p.weightGrams ?? null,
  }
}

export function toAdminProduct(p: PopulatedProduct): AdminProductDTO {
  const category = p.category
  return {
    ...toProductDetail(p),
    sku: p.sku ?? null,
    stock: p.stock,
    status: p.status,
    categoryId: category ? String('slug' in category ? category._id : category) : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}

const SORTS: Record<ProductListQuery['sort'], Record<string, 1 | -1>> = {
  featured: { isFeatured: -1, createdAt: -1, _id: 1 },
  newest: { createdAt: -1, _id: 1 },
  'price-asc': { price: 1, _id: 1 },
  'price-desc': { price: -1, _id: 1 },
  name: { name: 1, _id: 1 },
}

function searchFilter(q: string): QueryFilter<IProduct> {
  const pattern = new RegExp(escapeRegex(q), 'i')
  return { $or: [{ name: pattern }, { shortDescription: pattern }, { tags: pattern }, { sku: pattern }] }
}

/** Storefront listing: only active products, in active categories when filtered by one. */
export async function listPublicProducts(query: ProductListQuery): Promise<Paginated<ProductSummaryDTO>> {
  const filter: QueryFilter<IProduct> = { status: 'active' }

  if (query.category) {
    const category = await Category.findOne({ slug: query.category, isActive: true }).select('_id').lean()
    if (!category) return { items: [], page: query.page, limit: query.limit, total: 0, totalPages: 1 }
    filter.category = category._id
  }
  if (query.tag) filter.tags = query.tag
  if (query.featured !== undefined) filter.isFeatured = query.featured
  if (query.onSale) filter.compareAtPrice = { $exists: true }
  if (query.q) Object.assign(filter, searchFilter(query.q))

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort(SORTS[query.sort])
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate<{ category: ICategory | null }>('category', 'name slug')
      .lean(),
    Product.countDocuments(filter),
  ])

  return {
    items: items.map(toProductSummary),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  }
}

export async function getPublicProductBySlug(slug: string): Promise<ProductDetailDTO | null> {
  const product = await Product.findOne({ slug, status: 'active' })
    .populate<{ category: ICategory | null }>('category', 'name slug isActive')
    .lean()
  return product ? toProductDetail(product) : null
}

/** Other active products from the same category, for "you may also like". */
export async function getRelatedProducts(slug: string, limit = 4): Promise<ProductSummaryDTO[]> {
  const product = await Product.findOne({ slug, status: 'active' }).select('_id category tags').lean()
  if (!product) return []
  const filter: QueryFilter<IProduct> = { status: 'active', _id: { $ne: product._id } }
  if (product.category) filter.category = product.category
  else if (product.tags.length) filter.tags = { $in: product.tags }
  const items = await Product.find(filter)
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(limit)
    .populate<{ category: ICategory | null }>('category', 'name slug')
    .lean()
  return items.map(toProductSummary)
}

/* ---------------------------------- Admin ---------------------------------- */

export async function listAdminProducts(query: AdminProductListQuery): Promise<Paginated<AdminProductDTO>> {
  const filter: QueryFilter<IProduct> = {}
  if (query.status) filter.status = query.status
  if (query.category) filter.category = new Types.ObjectId(query.category)
  if (query.stock === 'out') filter.stock = { $lte: 0 }
  if (query.stock === 'low') filter.stock = { $gt: 0, $lte: LOW_STOCK_THRESHOLD }
  if (query.q) Object.assign(filter, searchFilter(query.q))

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort({ updatedAt: -1, _id: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate<{ category: ICategory | null }>('category', 'name slug')
      .lean(),
    Product.countDocuments(filter),
  ])
  return {
    items: items.map(toAdminProduct),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  }
}

export async function getAdminProduct(id: string): Promise<AdminProductDTO> {
  const product = await Product.findById(id).populate<{ category: ICategory | null }>('category', 'name slug').lean()
  if (!product) throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  return toAdminProduct(product)
}

async function assertCategoryExists(id: string | undefined) {
  if (id && !(await Category.exists({ _id: id }))) {
    throw createError({ statusCode: 422, statusMessage: 'Category does not exist' })
  }
}

function duplicateMessage(error: unknown): string {
  const keys = Object.keys((error as { keyPattern?: Record<string, unknown> }).keyPattern ?? {})
  return keys.includes('sku') ? 'Another product already uses this SKU' : 'Another product already uses this slug'
}

export async function createProduct(input: ProductInput): Promise<AdminProductDTO> {
  await assertCategoryExists(input.category)
  const slug = input.slug ?? slugify(input.name)
  if (!slug) throw createError({ statusCode: 422, statusMessage: 'Name must contain letters or numbers' })
  try {
    const created = await Product.create({ ...input, slug })
    return getAdminProduct(String(created._id))
  } catch (error) {
    if (isDuplicateKey(error)) throw createError({ statusCode: 409, statusMessage: duplicateMessage(error) })
    throw error
  }
}

export async function updateProduct(id: string, input: ProductUpdateInput): Promise<AdminProductDTO> {
  await assertCategoryExists(input.category)
  const existing = await Product.findById(id).select('price compareAtPrice').lean()
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Product not found' })

  // Validate compare-at against the stored price when only one of them changes.
  const price = input.price ?? existing.price
  const compareAt = input.compareAtPrice ?? existing.compareAtPrice
  if (compareAt !== undefined && compareAt <= price) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation failed',
      data: {
        code: 'VALIDATION_ERROR',
        issues: [{ path: 'compareAtPrice', message: 'Compare-at price must be higher than the price' }],
      },
    })
  }

  try {
    await Product.updateOne({ _id: id }, { $set: input }, { runValidators: true })
  } catch (error) {
    if (isDuplicateKey(error)) throw createError({ statusCode: 409, statusMessage: duplicateMessage(error) })
    throw error
  }
  return getAdminProduct(id)
}

/** Clears the compare-at price (a separate action because `$set` can't express removal). */
export async function clearCompareAtPrice(id: string) {
  await Product.updateOne({ _id: id }, { $unset: { compareAtPrice: '' } })
}

/** Products are archived, never deleted: past orders keep referencing them. */
export async function archiveProduct(id: string): Promise<AdminProductDTO> {
  const result = await Product.updateOne({ _id: id }, { $set: { status: 'archived', isFeatured: false } })
  if (!result.matchedCount) throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  return getAdminProduct(id)
}
