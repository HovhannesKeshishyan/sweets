import { idParamsSchema } from '../../../../shared/schemas/common'
import { archiveProduct } from '../../../services/product.service'

/** Archives (never hard-deletes) so historical orders stay intact. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { id } = validateParams(event, idParamsSchema)
  return archiveProduct(id)
})
