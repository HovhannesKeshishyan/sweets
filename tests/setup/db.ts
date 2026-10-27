import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, inject } from "vitest";
import {
  connectToDatabase,
  disconnectFromDatabase,
} from "../../server/db/connection";
import "../../server/db/models"; // registers every model

export const mongoUri = inject("mongoUri");
export const hasDatabase = Boolean(mongoUri);

/**
 * Registers hooks giving each test file its own database, with indexes built
 * (unique constraints matter for tests) and collections emptied between tests.
 * Call inside a `describe.skipIf(!hasDatabase)` block.
 */
export function useTestDatabase() {
  beforeAll(async () => {
    const url = new URL(mongoUri);
    url.pathname = `/test_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;
    await connectToDatabase(url.toString());
    await Promise.all(
      mongoose.modelNames().map((name) => mongoose.model(name).syncIndexes()),
    );
  });

  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.connection.db?.dropDatabase();
    await disconnectFromDatabase();
  });
}
