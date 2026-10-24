import { searchPageQuerySchema } from '../../../../shared/schemas/common'
import { listCustomers } from '../../../services/customer.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return listCustomers(validateQuery(event, searchPageQuerySchema))
})
