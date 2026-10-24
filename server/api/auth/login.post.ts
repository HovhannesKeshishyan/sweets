import { loginSchema } from '../../../shared/schemas/auth'
import { RATE_LIMITS } from '../../services/rate-limiter'
import { authenticate } from '../../services/auth.service'

export default defineEventHandler(async (event) => {
  await enforceRateLimit(event, RATE_LIMITS.login)
  const input = await validateBody(event, loginSchema)
  // Second limit per account slows distributed guessing against one email.
  await enforceRateLimit(event, RATE_LIMITS.loginAccount, input.email)

  await useDatabase()
  const user = await authenticate(input)
  await startUserSession(event, user._id)

  return { user: toPublicUser(user) }
})
