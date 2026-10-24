import { idParamsSchema } from "../../../../shared/schemas/common"
import { couponUpdateSchema } from "../../../../shared/schemas/coupon"
import { updateCoupon } from "../../../services/coupon.service"

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { id } = validateParams(event, idParamsSchema)
  return updateCoupon(id, await validateBody(event, couponUpdateSchema))
})
