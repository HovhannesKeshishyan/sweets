import { connectToDatabase } from "../db/connection"

/**
 * Ensures the database is connected before a handler touches a model.
 * Call at the top of any route handler (or service) that queries MongoDB.
 */
export async function useDatabase() {
  const { mongodbUri } = useRuntimeConfig()
  try {
    return await connectToDatabase(mongodbUri, { autoIndex: process.env.NODE_ENV !== "production" })
  } catch (error) {
    console.error("[db] connection failed:", error instanceof Error ? error.message : error)
    throw createError({ statusCode: 503, statusMessage: "Service temporarily unavailable" })
  }
}
