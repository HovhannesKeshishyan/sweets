import { categoryInputSchema } from "../../../../shared/schemas/catalog";
import { createCategory } from "../../../services/category.service";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const input = await validateBody(event, categoryInputSchema);
  setResponseStatus(event, 201);
  return createCategory(input);
});
