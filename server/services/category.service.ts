import { createError } from "h3";
import type { Types } from "mongoose";
import type {
  CategoryInput,
  CategoryUpdateInput,
} from "../../shared/schemas/catalog";
import type { CategoryDTO } from "../../shared/types/api";
import { slugify } from "../../shared/utils/slug";
import { Category, Product, type ICategory } from "../db/models";
import { isDuplicateKey } from "./errors";

export function toCategoryDTO(
  c: ICategory,
  productCount?: number,
): CategoryDTO {
  return {
    id: String(c._id),
    name: c.name,
    slug: c.slug,
    description: c.description ?? null,
    image: c.image
      ? {
          url: c.image.url,
          alt: c.image.alt ?? "",
          width: c.image.width,
          height: c.image.height,
        }
      : null,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    ...(productCount !== undefined && { productCount }),
  };
}

async function countActiveProducts(ids: Types.ObjectId[], statuses: string[]) {
  const rows = await Product.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { category: { $in: ids }, status: { $in: statuses } } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.count]));
}

/** Active categories for the storefront, with counts of active products. */
export async function listPublicCategories(): Promise<CategoryDTO[]> {
  const categories = await Category.find({ isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .lean();
  const counts = await countActiveProducts(
    categories.map((c) => c._id),
    ["active"],
  );
  return categories.map((c) =>
    toCategoryDTO(c, counts.get(String(c._id)) ?? 0),
  );
}

export async function getPublicCategoryBySlug(slug: string) {
  const category = await Category.findOne({ slug, isActive: true }).lean();
  return category ? toCategoryDTO(category) : null;
}

export async function listAllCategories(): Promise<CategoryDTO[]> {
  const categories = await Category.find()
    .sort({ sortOrder: 1, name: 1 })
    .lean();
  const counts = await countActiveProducts(
    categories.map((c) => c._id),
    ["active", "draft", "archived"],
  );
  return categories.map((c) =>
    toCategoryDTO(c, counts.get(String(c._id)) ?? 0),
  );
}

export async function createCategory(
  input: CategoryInput,
): Promise<CategoryDTO> {
  const slug = input.slug ?? slugify(input.name);
  if (!slug)
    throw createError({
      statusCode: 422,
      statusMessage: "Name must contain letters or numbers",
    });
  try {
    const created = await Category.create({ ...input, slug });
    return toCategoryDTO(created.toObject());
  } catch (error) {
    if (isDuplicateKey(error))
      throw createError({
        statusCode: 409,
        statusMessage: "A category with this slug already exists",
      });
    throw error;
  }
}

export async function updateCategory(
  id: string,
  input: CategoryUpdateInput,
): Promise<CategoryDTO> {
  try {
    const updated = await Category.findByIdAndUpdate(
      id,
      { $set: input },
      { returnDocument: "after", runValidators: true },
    ).lean();
    if (!updated)
      throw createError({
        statusCode: 404,
        statusMessage: "Category not found",
      });
    return toCategoryDTO(updated);
  } catch (error) {
    if (isDuplicateKey(error))
      throw createError({
        statusCode: 409,
        statusMessage: "A category with this slug already exists",
      });
    throw error;
  }
}

/** Deletes a category only when no product references it; otherwise deactivate it instead. */
export async function deleteCategory(id: string): Promise<void> {
  const inUse = await Product.exists({ category: id });
  if (inUse) {
    throw createError({
      statusCode: 409,
      statusMessage:
        "This category still has products. Move them or deactivate the category instead.",
    });
  }
  const result = await Category.deleteOne({ _id: id });
  if (!result.deletedCount)
    throw createError({ statusCode: 404, statusMessage: "Category not found" });
}
