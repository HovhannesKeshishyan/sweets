import { idParamsSchema } from "../../../../shared/schemas/common";
import { getCoupon } from "../../../services/coupon.service";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const { id } = validateParams(event, idParamsSchema);
  return getCoupon(id);
});
