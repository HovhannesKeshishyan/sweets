import { productUpdateSchema } from "../../../../shared/schemas/catalog";
import { idParamsSchema } from "../../../../shared/schemas/common";
import {
  clearCompareAtPrice,
  updateProduct,
} from "../../../services/product.service";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const { id } = validateParams(event, idParamsSchema);
  const body = await readBody<Record<string, unknown>>(event);

  // `compareAtPrice: null` removes the promotional "was" price.
  const clearCompareAt =
    body && typeof body === "object" && body.compareAtPrice === null;
  if (clearCompareAt) delete body.compareAtPrice;

  const input = parseWith(productUpdateSchema, body);
  if (clearCompareAt) await clearCompareAtPrice(id);
  return updateProduct(id, input);
});
