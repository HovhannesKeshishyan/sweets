import { isAllowedOrigin, isSafeMethod } from '../services/origin'

/** Rejects cross-site state-changing API requests (see services/origin.ts). */
export default defineEventHandler((event) => {
  if (!event.path.startsWith('/api/') || isSafeMethod(event.method)) return

  const origin = getHeader(event, 'origin')
  const host = getRequestHost(event, { xForwardedHost: Boolean(useRuntimeConfig().trustProxy) })
  if (!isAllowedOrigin(origin, host, useRuntimeConfig().public.siteUrl)) {
    throw createError({ statusCode: 403, statusMessage: 'Cross-site request blocked' })
  }
})
