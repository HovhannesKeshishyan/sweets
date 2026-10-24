import { z } from "zod"

/** Reusable field schemas. Strings are trimmed; HTML is never interpreted by the UI. */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email("Enter a valid email address"))

export const nameSchema = z.string().trim().min(1, "Required").max(100)

export const phoneSchema = z
  .string()
  .trim()
  .max(30)
  .regex(/^[+\d][\d\s().-]{4,}$/, "Enter a valid phone number")

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(140)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens")

/** Integer amount in minor units (cents). */
export const minorAmountSchema = z.number().int("Must be a whole number of minor units").min(0).max(100_000_000)

export const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Use a 3-letter ISO currency code")
  .refine((code) => {
    try {
      new Intl.NumberFormat("en", { style: "currency", currency: code })
      return true
    } catch {
      return false
    }
  }, "Unknown currency")

export const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, "Use a 2-letter country code")

export const addressSchema = z.object({
  line1: z.string().trim().min(1, "Required").max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1, "Required").max(100),
  region: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().min(1, "Required").max(20),
  country: countryCodeSchema,
})

export const imageInputSchema = z.object({
  // An http(s) URL, or a site-relative path such as /uploads/truffles.svg.
  url: z.union(
    [
      z.url({ protocol: /^https?$/ }).max(2048),
      z
        .string()
        .max(512)
        .regex(/^\/(?![/\\])[\w\-./%]+$/),
    ],
    { error: "Use an http(s) image URL or a /path on this site" },
  ),
  alt: z.string().trim().max(200).default(""),
  provider: z.enum(["cloudinary", "s3", "external"]).default("external"),
  publicId: z.string().trim().max(300).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
})

export type AddressInput = z.infer<typeof addressSchema>
export type ImageInput = z.infer<typeof imageInputSchema>
