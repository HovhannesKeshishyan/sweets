import { idParamsSchema } from "../../../../shared/schemas/common"
import { getOrderById } from "../../../services/order.service"

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { id } = validateParams(event, idParamsSchema)
  return getOrderById(id)
})
