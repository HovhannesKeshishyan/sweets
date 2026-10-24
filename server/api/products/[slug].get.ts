import { z } from 'zod'
import { slugSchema } from '../../../shared/schemas/fields'
import { getPublicProductBySlug, getRelatedProducts } from '../../services/product.service'

export default defineEventHandler(async (event) => {
  const { slug } = validateParams(event, z.object({ slug: slugSchema }))
  await useDatabase()
  const product = await getPublicProductBySlug(slug)
  if (!product) throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  return { product, related: await getRelatedProducts(slug) }
})
