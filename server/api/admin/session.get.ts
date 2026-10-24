/** Confirms the caller is an admin; used by the admin UI on load. */
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const admin = await requireAdmin(event)
  return { user: toPublicUser(admin) }
})
