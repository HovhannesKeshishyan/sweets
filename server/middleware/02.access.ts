/**
 * Route-prefix access control, applied before any handler runs:
 *   /api/admin/**   → admin role required
 *   /api/account/** → signed-in user required
 * Handlers call requireAdmin/requireUser again (cached per request), so a
 * route moved outside these prefixes still stays protected.
 */
export default defineEventHandler(async (event) => {
  // Normalise so variants like `/api//Admin/` or `/api/%61dmin` can't slip past the prefix check.
  let path = event.path.split('?')[0] ?? ''
  try {
    path = decodeURIComponent(path)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Malformed URL' })
  }
  path = path.replace(/\/{2,}/g, '/').toLowerCase()
  if (path === '/api/admin' || path.startsWith('/api/admin/')) {
    await requireAdmin(event)
  } else if (path === '/api/account' || path.startsWith('/api/account/')) {
    await requireUser(event)
  }
})
