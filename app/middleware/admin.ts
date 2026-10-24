/** UX guard for /admin pages. Real protection is on the /api/admin/** routes. */
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuth()
  await auth.ensureLoaded()
  if (!auth.isLoggedIn.value) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
  if (!auth.isAdmin.value) {
    return abortNavigation(createError({ statusCode: 403, statusMessage: 'Forbidden' }))
  }
})
