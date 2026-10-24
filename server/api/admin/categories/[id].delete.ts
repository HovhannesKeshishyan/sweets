import { idParamsSchema } from "../../../../shared/schemas/common"
import { deleteCategory } from "../../../services/category.service"

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { id } = validateParams(event, idParamsSchema)
  await deleteCategory(id)
  setResponseStatus(event, 204)
  return null
})
