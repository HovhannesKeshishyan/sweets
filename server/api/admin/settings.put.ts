import { storeSettingsUpdateSchema } from '../../../shared/schemas/settings'
import { updateStoreSettings } from '../../services/settings.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const input = await validateBody(event, storeSettingsUpdateSchema)
  await updateStoreSettings(input, storeDefaults())
  return { ok: true }
})
