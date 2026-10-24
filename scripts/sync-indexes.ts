/**
 * Creates/updates MongoDB indexes for every model. Run on each deploy:
 *   npm run db:indexes
 * (Production disables Mongoose autoIndex so index builds never block startup.)
 */
import { existsSync } from "node:fs";
import mongoose from "mongoose";
import {
  connectToDatabase,
  disconnectFromDatabase,
} from "../server/db/connection";
import "../server/db/models";

async function main() {
  if (existsSync(".env")) process.loadEnvFile(".env");
  const uri = process.env.NUXT_MONGODB_URI;
  if (!uri) {
    console.error("NUXT_MONGODB_URI is not set (environment or .env).");
    process.exit(1);
  }
  await connectToDatabase(uri, { autoIndex: false });
  for (const name of mongoose.modelNames()) {
    const dropped = await mongoose.model(name).syncIndexes();
    console.log(
      `${name}: indexes in sync${dropped.length ? ` (removed ${dropped.join(", ")})` : ""}`,
    );
  }
  await disconnectFromDatabase();
}

main().catch(async (error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  await disconnectFromDatabase().catch(() => {});
  process.exit(1);
});
