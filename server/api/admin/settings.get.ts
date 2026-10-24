import { getStoreSettings } from "../../services/settings.service"

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const s = await getStoreSettings(storeDefaults())
  return {
    storeName: s.storeName,
    contactEmail: s.contactEmail ?? null,
    contactPhone: s.contactPhone ?? null,
    address: s.address ?? null,
    currency: s.currency,
    shipping: {
      flatRate: s.shipping.flatRate,
      freeShippingThreshold: s.shipping.freeShippingThreshold ?? null,
      allowedCountries: s.shipping.allowedCountries,
    },
    uploadsEnabled: Boolean(useRuntimeConfig().cloudinary.cloudName),
  }
})
