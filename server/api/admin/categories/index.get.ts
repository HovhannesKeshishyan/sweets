import { listAllCategories } from "../../../services/category.service"

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return { items: await listAllCategories() }
})
