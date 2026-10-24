/**
 * Creates an administrator, or promotes an existing account and resets its password.
 *
 *   npm run create-admin -- --email owner@example.com --name "Store Owner"
 *
 * The password is prompted for (hidden), or read from ADMIN_PASSWORD for CI.
 * Reads NUXT_MONGODB_URI from the environment or `.env`.
 */
import { existsSync } from "node:fs";
import { parseArgs } from "node:util";
import { createInterface } from "node:readline";
import { z } from "zod";
import { emailSchema, nameSchema } from "../shared/schemas/fields";
import { passwordSchema } from "../shared/schemas/auth";
import {
  connectToDatabase,
  disconnectFromDatabase,
} from "../server/db/connection";
import { upsertAdmin } from "../server/services/auth.service";

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    const output = rl as unknown as {
      _writeToOutput: (s: string) => void;
      output: NodeJS.WriteStream;
    };
    let muted = false;
    output._writeToOutput = (s: string) => {
      if (!muted || s.includes("\n")) output.output.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    muted = true;
  });
}

async function main() {
  if (existsSync(".env")) process.loadEnvFile(".env");

  const { values } = parseArgs({
    options: { email: { type: "string" }, name: { type: "string" } },
  });

  const args = z
    .object({ email: emailSchema, name: nameSchema.default("Administrator") })
    .safeParse(values);
  if (!args.success) {
    console.error(
      'Usage: npm run create-admin -- --email <email> [--name "<name>"]',
    );
    console.error(
      args.error.issues
        .map((i) => `  ${i.path.join(".")}: ${i.message}`)
        .join("\n"),
    );
    process.exit(1);
  }

  const uri = process.env.NUXT_MONGODB_URI;
  if (!uri) {
    console.error("NUXT_MONGODB_URI is not set (environment or .env).");
    process.exit(1);
  }

  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = await promptHidden("Admin password: ");
    const confirm = await promptHidden("Confirm password: ");
    if (password !== confirm) {
      console.error("Passwords do not match.");
      process.exit(1);
    }
  }
  const pw = passwordSchema.safeParse(password);
  if (!pw.success) {
    console.error(pw.error.issues[0]?.message);
    process.exit(1);
  }

  await connectToDatabase(uri);
  const user = await upsertAdmin({
    email: args.data.email,
    name: args.data.name,
    password: pw.data,
  });
  console.log(`Admin ready: ${user?.email}`);
  await disconnectFromDatabase();
}

main().catch(async (error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  await disconnectFromDatabase().catch(() => {});
  process.exit(1);
});
