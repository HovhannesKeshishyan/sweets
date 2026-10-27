import { connectToDatabase, disconnectFromDatabase } from "../db/connection";

/**
 * Opens the MongoDB connection when the server starts so the first request
 * doesn't pay the connection cost. Failure is logged, not fatal: handlers
 * retry through `useDatabase()` and the health check reports the state.
 */
export default defineNitroPlugin((nitroApp) => {
  const { mongodbUri } = useRuntimeConfig();

  if (!mongodbUri) {
    console.warn(
      "[db] NUXT_MONGODB_URI is not set; database features are unavailable.",
    );
  } else {
    connectToDatabase(mongodbUri, {
      autoIndex: process.env.NODE_ENV !== "production",
    })
      .then(() => console.info("[db] connected"))
      .catch((error: unknown) =>
        console.error(
          "[db] initial connection failed:",
          error instanceof Error ? error.message : error,
        ),
      );
  }

  nitroApp.hooks.hook("close", async () => {
    await disconnectFromDatabase();
  });
});
