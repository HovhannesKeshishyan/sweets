import mongoose from "mongoose"

/**
 * Global Mongoose settings, applied once before the first connection.
 * - strictQuery: unknown filter keys are dropped instead of passed to MongoDB.
 *
 * NoSQL-injection defence lives at the input boundary instead of `sanitizeFilter`
 * (which would also neutralise our own `$gte`/`$in` operators used for atomic stock
 * updates and catalog filters): every request is parsed by Zod into primitives, and
 * `parseWith` rejects any `$`-prefixed or dotted keys before parsing.
 */
mongoose.set("strictQuery", true)

let pending: Promise<typeof mongoose> | null = null

export interface ConnectOptions {
  /** Build indexes automatically. Disable in production and sync indexes on deploy. */
  autoIndex?: boolean
}

/**
 * Connects to MongoDB once and reuses the connection across requests.
 * Concurrent callers share the same in-flight promise; a failed attempt is
 * cleared so the next request can retry.
 */
export function connectToDatabase(uri: string, options: ConnectOptions = {}): Promise<typeof mongoose> {
  if (!uri) {
    return Promise.reject(new Error("MongoDB URI is not configured (set NUXT_MONGODB_URI)."))
  }
  if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) {
    return Promise.resolve(mongoose)
  }
  if (!pending) {
    pending = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 5000,
        autoIndex: options.autoIndex ?? true,
      })
      .catch((error: unknown) => {
        pending = null
        throw error
      })
  }
  return pending
}

export async function disconnectFromDatabase(): Promise<void> {
  pending = null
  await mongoose.disconnect()
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected
}
