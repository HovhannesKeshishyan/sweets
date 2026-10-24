import { isDatabaseConnected } from "../db/connection"

/**
 * Liveness/readiness probe. Reports database reachability without leaking
 * connection details. Returns 503 when MongoDB is unreachable.
 */
export default defineEventHandler(async (event) => {
  try {
    await useDatabase()
  } catch {
    // useDatabase already logged the cause.
  }

  const database = isDatabaseConnected() ? "up" : "down"
  if (database === "down") setResponseStatus(event, 503)
  setHeader(event, "Cache-Control", "no-store")

  return { status: database === "up" ? "ok" : "degraded", database }
})
