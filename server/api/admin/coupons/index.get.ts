import { listCoupons } from "../../../services/coupon.service";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  return { items: await listCoupons() };
});
