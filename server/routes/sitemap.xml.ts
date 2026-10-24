import { Category, Product } from '../db/models'

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!)

/** XML sitemap of public pages, active categories and active products. */
export default defineEventHandler(async (event) => {
  await useDatabase()
  const { siteUrl } = useRuntimeConfig().public
  const [products, categories] = await Promise.all([
    Product.find({ status: 'active' }).select('slug updatedAt').lean(),
    Category.find({ isActive: true }).select('slug updatedAt').lean(),
  ])

  const url = (path: string, lastmod?: Date) =>
    `<url><loc>${escapeXml(new URL(path, siteUrl).toString())}</loc>${lastmod ? `<lastmod>${lastmod.toISOString()}</lastmod>` : ''}</url>`

  const entries = [
    url('/'),
    url('/products'),
    url('/collections'),
    url('/gifts'),
    ...categories.map((c) => url(`/products?category=${encodeURIComponent(c.slug)}`, c.updatedAt)),
    ...products.map((p) => url(`/products/${encodeURIComponent(p.slug)}`, p.updatedAt)),
  ]

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join('')}</urlset>\n`
})
