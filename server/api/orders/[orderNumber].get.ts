import { z } from "zod"
import { orderNumberSchema } from "../../../shared/schemas/order"
import { getOrderForViewer } from "../../services/order.service"

/** Order confirmation: visible to the signed-in owner or with the token from the confirmation link. */
export default defineEventHandler(async (event) => {
  const { orderNumber } = validateParams(event, z.object({ orderNumber: orderNumberSchema }))
  const { token } = validateQuery(event, z.object({ token: z.string().max(128).optional() }))

  await useDatabase()
  const user = await getSessionUser(event)
  setHeader(event, "Cache-Control", "private, no-store")
  return getOrderForViewer(orderNumber, { userId: user?._id, token, secret: getSessionSecret() })
})
