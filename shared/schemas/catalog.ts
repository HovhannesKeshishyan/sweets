import { z } from "zod";
import { PRODUCT_STATUSES } from "../constants";
import { objectIdSchema } from "./common";
import { imageInputSchema, minorAmountSchema, slugSchema } from "./fields";

/*
 * Update schemas are built from field definitions WITHOUT defaults: Zod 4 applies
 * `.default()` even inside `.partial()`, which would silently reset omitted fields.
 */

const tagSchema = z.string().trim().toLowerCase().min(1).max(40);

const categoryFields = {
  name: z.string().trim().min(1, "Required").max(80),
  slug: slugSchema,
  description: z.string().trim().max(1000),
  image: imageInputSchema,
  sortOrder: z.number().int().min(-10_000).max(10_000),
  isActive: z.boolean(),
};

export const categoryInputSchema = z.object({
  ...categoryFields,
  slug: categoryFields.slug.optional(),
  description: categoryFields.description.optional(),
  image: categoryFields.image.optional(),
  sortOrder: categoryFields.sortOrder.default(0),
  isActive: categoryFields.isActive.default(true),
});

export const categoryUpdateSchema = z.object(categoryFields).partial();

const productFields = {
  name: z.string().trim().min(1, "Required").max(120),
  slug: slugSchema,
  sku: z.string().trim().toUpperCase().max(64),
  shortDescription: z.string().trim().max(280),
  description: z.string().trim().min(1, "Required").max(5000),
  price: minorAmountSchema.min(1, "Price must be greater than zero"),
  compareAtPrice: minorAmountSchema,
  images: z.array(imageInputSchema).max(12),
  category: objectIdSchema,
  tags: z.array(tagSchema).max(20),
  ingredients: z.string().trim().max(2000),
  allergens: z.array(tagSchema).max(20),
  weightGrams: z.number().int().min(0).max(100_000),
  stock: z.number().int("Stock must be a whole number").min(0).max(1_000_000),
  isFeatured: z.boolean(),
  status: z.enum(PRODUCT_STATUSES),
};

const compareAtAbovePrice = (p: { price?: number; compareAtPrice?: number }) =>
  p.compareAtPrice === undefined ||
  p.price === undefined ||
  p.compareAtPrice > p.price;

const compareAtRule = {
  path: ["compareAtPrice"],
  message: "Compare-at price must be higher than the price",
};

export const productInputSchema = z
  .object({
    ...productFields,
    slug: productFields.slug.optional(),
    sku: productFields.sku.optional(),
    shortDescription: productFields.shortDescription.optional(),
    compareAtPrice: productFields.compareAtPrice.optional(),
    images: productFields.images.default([]),
    category: productFields.category.optional(),
    tags: productFields.tags.default([]),
    ingredients: productFields.ingredients.optional(),
    allergens: productFields.allergens.default([]),
    weightGrams: productFields.weightGrams.optional(),
    stock: productFields.stock.default(0),
    isFeatured: productFields.isFeatured.default(false),
    status: productFields.status.default("draft"),
  })
  .refine(compareAtAbovePrice, compareAtRule);

export const productUpdateSchema = z
  .object(productFields)
  .partial()
  .refine(compareAtAbovePrice, compareAtRule);

export const PRODUCT_SORTS = [
  "featured",
  "newest",
  "price-asc",
  "price-desc",
  "name",
] as const;

export const productListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: slugSchema.optional(),
  tag: tagSchema.optional(),
  featured: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  /** Only products with a compare-at ("was") price. */
  onSale: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  sort: z.enum(PRODUCT_SORTS).default("featured"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(12),
});

export const adminProductListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  category: objectIdSchema.optional(),
  stock: z.enum(["low", "out"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminProductListQuery = z.infer<typeof adminProductListQuerySchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
