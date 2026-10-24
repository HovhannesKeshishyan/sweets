import { z } from 'zod'
import { addressSchema, countryCodeSchema, currencySchema, emailSchema, minorAmountSchema, phoneSchema } from './fields'

export const storeSettingsUpdateSchema = z
  .object({
    storeName: z.string().trim().min(1).max(80),
    contactEmail: emailSchema.nullable(),
    contactPhone: phoneSchema.nullable(),
    address: addressSchema.nullable(),
    currency: currencySchema,
    shipping: z.object({
      flatRate: minorAmountSchema,
      freeShippingThreshold: minorAmountSchema.nullable(),
      allowedCountries: z.array(countryCodeSchema).max(250),
    }),
  })
  .partial()

export type StoreSettingsUpdate = z.infer<typeof storeSettingsUpdateSchema>
