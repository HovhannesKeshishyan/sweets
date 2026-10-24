/** Current user, or `{ user: null }` when signed out. Never cached. */
export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "private, no-store")
  const user = await getSessionUser(event)
  return { user: user ? toPublicUser(user) : null }
})
