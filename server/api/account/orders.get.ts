import { paginationQuerySchema } from "../../../shared/schemas/common";
import { listUserOrders } from "../../services/order.service";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { page, limit } = validateQuery(event, paginationQuerySchema);
  setHeader(event, "Cache-Control", "private, no-store");
  return listUserOrders(user._id, page, limit);
});
