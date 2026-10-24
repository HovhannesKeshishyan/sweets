import { couponInputSchema } from "../../../../shared/schemas/coupon"
import { createCoupon } from "../../../services/coupon.service"

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const input = await validateBody(event, couponInputSchema)
  setResponseStatus(event, 201)
  return createCoupon(input)
})
