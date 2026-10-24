import { getStoreSettings, toPublicStore } from '../services/settings.service'

/** Public store info: name, currency, shipping rules. */
export default defineEventHandler(async () => {
  await useDatabase()
  return toPublicStore(await getStoreSettings(storeDefaults()))
})
