import mongoose, { Schema, type Model } from "mongoose"

/** Reuses a compiled model during dev hot reloads instead of throwing OverwriteModelError. */
export function defineModel<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T> | undefined) ?? mongoose.model<T>(name, schema)
}

/** Integer amount in the currency's minor unit (e.g. cents). */
export const moneyField = {
  type: Number,
  required: true,
  min: 0,
  validate: { validator: Number.isSafeInteger, message: "Amount must be an integer in minor units" },
} as const

export interface ImageRef {
  url: string
  alt: string
  provider?: "cloudinary" | "s3" | "external"
  publicId?: string
  width?: number
  height?: number
}

export const imageSchema = new Schema<ImageRef>(
  {
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    alt: { type: String, default: "", trim: true, maxlength: 200 },
    provider: { type: String, enum: ["cloudinary", "s3", "external"], default: "external" },
    publicId: { type: String, trim: true, maxlength: 300 },
    width: { type: Number, min: 1 },
    height: { type: Number, min: 1 },
  },
  { _id: false },
)

export interface Address {
  line1: string
  line2?: string
  city: string
  region?: string
  postalCode: string
  country: string // ISO 3166-1 alpha-2
}

export const addressSchema = new Schema<Address>(
  {
    line1: { type: String, required: true, trim: true, maxlength: 200 },
    line2: { type: String, trim: true, maxlength: 200 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    region: { type: String, trim: true, maxlength: 100 },
    postalCode: { type: String, required: true, trim: true, maxlength: 20 },
    country: { type: String, required: true, uppercase: true, trim: true, minlength: 2, maxlength: 2 },
  },
  { _id: false },
)

/** Removes internals from JSON output. */
export function cleanJson(_doc: unknown, ret: Record<string, unknown>) {
  ret.id = String(ret._id)
  delete ret._id
  delete ret.__v
  return ret
}
