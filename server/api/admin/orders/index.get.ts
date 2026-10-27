import { adminOrderListQuerySchema } from "../../../../shared/schemas/order";
import { listOrders } from "../../../services/order.service";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  return listOrders(validateQuery(event, adminOrderListQuerySchema));
});
