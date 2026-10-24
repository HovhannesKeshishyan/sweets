/** UX guard for customer pages. Real protection is on the /api/account/** routes. */
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuth()
  await auth.ensureLoaded()
  if (!auth.isLoggedIn.value) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
})
