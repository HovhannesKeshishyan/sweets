import { registerSchema } from '../../../shared/schemas/auth'
import { RATE_LIMITS } from '../../services/rate-limiter'
import { registerCustomer } from '../../services/auth.service'

export default defineEventHandler(async (event) => {
  await enforceRateLimit(event, RATE_LIMITS.register)
  const input = await validateBody(event, registerSchema)

  await useDatabase()
  const user = await registerCustomer(input)
  await startUserSession(event, user._id)

  setResponseStatus(event, 201)
  return { user: toPublicUser(user) }
})
