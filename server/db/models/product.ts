import { Schema, type Types } from "mongoose";
import {
  PRODUCT_STATUSES,
  type ProductStatus,
} from "../../../shared/constants";
import {
  cleanJson,
  defineModel,
  imageSchema,
  moneyField,
  type ImageRef,
} from "./_shared";

export interface IProduct {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  sku?: string;
  shortDescription?: string;
  description: string;
  /** Unit price in minor units of the store currency. */
  price: number;
  /** Optional "was" price for promotions, in minor units. */
  compareAtPrice?: number;
  images: ImageRef[];
  category?: Types.ObjectId;
  /** Free-form labels, e.g. "gift", "vegan", "seasonal". Drives gift collections. */
  tags: string[];
  ingredients?: string;
  allergens: string[];
  weightGrams?: number;
  /** Units available to sell. Decremented atomically at checkout. */
  stock: number;
  isFeatured: boolean;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 140,
    },
    sku: { type: String, trim: true, uppercase: true, maxlength: 64 },
    shortDescription: { type: String, trim: true, maxlength: 280 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    price: moneyField,
    compareAtPrice: { ...moneyField, required: false },
    images: { type: [imageSchema], default: [] },
    category: { type: Schema.Types.ObjectId, ref: "Category" },
    tags: {
      type: [{ type: String, lowercase: true, trim: true, maxlength: 40 }],
      default: [],
    },
    ingredients: { type: String, trim: true, maxlength: 2000 },
    allergens: {
      type: [{ type: String, lowercase: true, trim: true, maxlength: 40 }],
      default: [],
    },
    weightGrams: { type: Number, min: 0 },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "Stock must be an integer",
      },
    },
    isFeatured: { type: Boolean, default: false },
    status: {
      type: String,
      enum: PRODUCT_STATUSES,
      default: "draft",
      required: true,
    },
  },
  { timestamps: true, toJSON: { transform: cleanJson } },
);

// Catalog queries always filter by status first.
productSchema.index({ status: 1, category: 1, createdAt: -1 });
productSchema.index({ status: 1, isFeatured: 1 });
productSchema.index({ status: 1, price: 1 });
productSchema.index({ status: 1, tags: 1 });
productSchema.index(
  { sku: 1 },
  { unique: true, partialFilterExpression: { sku: { $type: "string" } } },
);

export const Product = defineModel<IProduct>("Product", productSchema);
