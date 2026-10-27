import { Schema, type Types } from "mongoose";
import { addressSchema, defineModel, type Address } from "./_shared";

/** Singleton document (key = "store") holding store-wide configuration. */
export interface IStoreSettings {
  _id: Types.ObjectId;
  key: "store";
  storeName: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: Address;
  /** ISO 4217 code used for all prices. */
  currency: string;
  shipping: {
    /** Flat shipping fee in minor units. */
    flatRate: number;
    /** Subtotal at or above which shipping is free; unset disables free shipping. */
    freeShippingThreshold?: number;
    /** ISO 3166-1 alpha-2 codes; empty means ship everywhere. */
    allowedCountries: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const integer = {
  validator: Number.isSafeInteger,
  message: "{PATH} must be an integer",
};

const storeSettingsSchema = new Schema<IStoreSettings>(
  {
    key: {
      type: String,
      enum: ["store"],
      default: "store",
      unique: true,
      immutable: true,
    },
    storeName: { type: String, required: true, trim: true, maxlength: 80 },
    contactEmail: { type: String, lowercase: true, trim: true, maxlength: 254 },
    contactPhone: { type: String, trim: true, maxlength: 30 },
    address: { type: addressSchema },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      minlength: 3,
      maxlength: 3,
    },
    shipping: {
      flatRate: { type: Number, default: 0, min: 0, validate: integer },
      freeShippingThreshold: { type: Number, min: 0, validate: integer },
      allowedCountries: {
        type: [{ type: String, uppercase: true, minlength: 2, maxlength: 2 }],
        default: [],
      },
    },
  },
  { timestamps: true },
);

export const StoreSettings = defineModel<IStoreSettings>(
  "StoreSettings",
  storeSettingsSchema,
);
