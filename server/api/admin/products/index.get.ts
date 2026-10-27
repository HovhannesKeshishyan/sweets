import { adminProductListQuerySchema } from "../../../../shared/schemas/catalog";
import { listAdminProducts } from "../../../services/product.service";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  return listAdminProducts(validateQuery(event, adminProductListQuerySchema));
});
