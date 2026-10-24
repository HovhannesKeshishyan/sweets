import { idParamsSchema } from "../../../../shared/schemas/common"
import { getCustomer } from "../../../services/customer.service"

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { id } = validateParams(event, idParamsSchema)
  return getCustomer(id)
})
