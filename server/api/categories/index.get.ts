import { listPublicCategories } from "../../services/category.service"

export default defineEventHandler(async () => {
  await useDatabase()
  return { items: await listPublicCategories() }
})
