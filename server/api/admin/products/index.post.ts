import { productInputSchema } from "../../../../shared/schemas/catalog";
import { createProduct } from "../../../services/product.service";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const input = await validateBody(event, productInputSchema);
  setResponseStatus(event, 201);
  return createProduct(input);
});
