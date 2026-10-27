import { idParamsSchema } from "../../../../../shared/schemas/common";
import { orderStatusUpdateSchema } from "../../../../../shared/schemas/order";
import { updateOrderStatus } from "../../../../services/order.service";

/** Updates fulfillment status only. Payment status can't be changed here. */
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const { id } = validateParams(event, idParamsSchema);
  const { status, note } = await validateBody(event, orderStatusUpdateSchema);
  return updateOrderStatus(id, status, { adminId: admin._id, note });
});
