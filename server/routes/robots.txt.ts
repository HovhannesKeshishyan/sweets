/** robots.txt: keep private areas out of search engines and point to the sitemap. */
export default defineEventHandler((event) => {
  const { siteUrl } = useRuntimeConfig().public
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return [
    'User-agent: *',
    'Disallow: /admin',
    'Disallow: /account',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /order/',
    'Disallow: /api/',
    `Sitemap: ${new URL('/sitemap.xml', siteUrl).toString()}`,
    '',
  ].join('\n')
})
