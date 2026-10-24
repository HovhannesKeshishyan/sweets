import { productListQuerySchema } from "../../../shared/schemas/catalog"
import { listPublicProducts } from "../../services/product.service"

export default defineEventHandler(async (event) => {
  const query = validateQuery(event, productListQuerySchema)
  await useDatabase()
  return listPublicProducts(query)
})
