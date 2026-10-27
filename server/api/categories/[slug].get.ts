import { z } from "zod";
import { slugSchema } from "../../../shared/schemas/fields";
import { getPublicCategoryBySlug } from "../../services/category.service";

export default defineEventHandler(async (event) => {
  const { slug } = validateParams(event, z.object({ slug: slugSchema }));
  await useDatabase();
  const category = await getPublicCategoryBySlug(slug);
  if (!category)
    throw createError({
      statusCode: 404,
      statusMessage: "Collection not found",
    });
  return category;
});
