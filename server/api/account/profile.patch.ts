import { profileUpdateSchema } from '../../../shared/schemas/auth'
import { updateProfile } from '../../services/user.service'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const input = await validateBody(event, profileUpdateSchema)
  return { profile: await updateProfile(user._id, input) }
})
