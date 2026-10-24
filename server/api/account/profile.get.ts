import { getProfile } from '../../services/user.service'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  return { profile: await getProfile(user._id) }
})
