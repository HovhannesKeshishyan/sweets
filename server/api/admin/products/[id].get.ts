import { idParamsSchema } from "../../../../shared/schemas/common";
import { getAdminProduct } from "../../../services/product.service";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const { id } = validateParams(event, idParamsSchema);
  return getAdminProduct(id);
});
