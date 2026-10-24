/**
 * Loads DEVELOPMENT sample data (categories, products, coupons, store settings).
 *
 *   npm run seed            # only if the catalog is empty
 *   npm run seed -- --reset # replaces categories, products, coupons and settings
 *
 * Never touches users, sessions or orders. Refuses to run when NODE_ENV=production.
 */
import { existsSync } from "node:fs"
import { parseArgs } from "node:util"
import { connectToDatabase, disconnectFromDatabase } from "../server/db/connection"
import { Category, Coupon, Product, StoreSettings } from "../server/db/models"
import { seedCategories, seedCoupons, seedProducts, seedSettings } from "./seed-data"

async function main() {
  if (existsSync(".env")) process.loadEnvFile(".env")
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to load sample data with NODE_ENV=production.")
    process.exit(1)
  }
  const uri = process.env.NUXT_MONGODB_URI
  if (!uri) {
    console.error("NUXT_MONGODB_URI is not set (environment or .env).")
    process.exit(1)
  }
  const { values } = parseArgs({ options: { reset: { type: "boolean", default: false } } })

  await connectToDatabase(uri)
  await Promise.all([Category.syncIndexes(), Product.syncIndexes(), Coupon.syncIndexes(), StoreSettings.syncIndexes()])

  if (values.reset) {
    await Promise.all([Category.deleteMany({}), Product.deleteMany({}), Coupon.deleteMany({}), StoreSettings.deleteMany({})])
    console.log("Cleared categories, products, coupons and settings.")
  } else if (await Product.exists({})) {
    console.log("Catalog already has products — nothing to do. Use --reset to replace it.")
    await disconnectFromDatabase()
    return
  }

  const categories = await Category.insertMany(seedCategories.map((c) => ({ ...c, isActive: true })))
  const categoryId = new Map(categories.map((c) => [c.slug, c._id]))

  await Product.insertMany(
    seedProducts.map((p) => ({ ...p, status: "active", isFeatured: p.isFeatured ?? false, category: categoryId.get(p.category) })),
  )

  await Coupon.insertMany(
    seedCoupons.map((c) => ({
      ...c,
      categories: (("categories" in c && c.categories) || []).map((slug) => categoryId.get(slug)),
    })),
  )

  await StoreSettings.updateOne({ key: "store" }, { $set: seedSettings }, { upsert: true })

  console.log(`Seeded ${categories.length} categories, ${seedProducts.length} products, ${seedCoupons.length} coupons.`)
  console.log(`Sample coupon codes: ${seedCoupons.map((c) => c.code).join(", ")}`)
  await disconnectFromDatabase()
}

main().catch(async (error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  await disconnectFromDatabase().catch(() => {})
  process.exit(1)
})
