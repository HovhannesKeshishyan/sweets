import { categoryUpdateSchema } from '../../../../shared/schemas/catalog'
import { idParamsSchema } from '../../../../shared/schemas/common'
import { updateCategory } from '../../../services/category.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { id } = validateParams(event, idParamsSchema)
  return updateCategory(id, await validateBody(event, categoryUpdateSchema))
})
