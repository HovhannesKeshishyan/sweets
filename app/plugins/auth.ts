/** Loads the current user and store settings once per app start (during SSR when available). */
export default defineNuxtPlugin(async () => {
  await Promise.all([useAuth().ensureLoaded(), useStore().load()])
})
