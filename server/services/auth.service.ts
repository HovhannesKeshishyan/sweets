import { createError } from "h3";
import type { UserRole } from "../../shared/constants";
import type { LoginInput, RegisterInput } from "../../shared/schemas/auth";
import { User, type IUser } from "../db/models";
import {
  hashPassword,
  needsRehash,
  verifyAgainstDummy,
  verifyPassword,
} from "./password";

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}

/** Public sign-up. Always creates a `customer`; the role is never taken from input. */
export async function registerCustomer(input: RegisterInput): Promise<IUser> {
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: "customer",
    });
    return user.toObject();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw createError({
        statusCode: 409,
        statusMessage: "An account with this email already exists",
      });
    }
    throw error;
  }
}

const INVALID_CREDENTIALS = "Invalid email or password";

/**
 * Verifies credentials. Unknown emails, wrong passwords and disabled accounts
 * all produce the same error after the same amount of work.
 */
export async function authenticate(input: LoginInput): Promise<IUser> {
  const user = await User.findOne({ email: input.email }).select(
    "+passwordHash",
  );

  if (!user) {
    await verifyAgainstDummy(input.password);
    throw createError({ statusCode: 401, statusMessage: INVALID_CREDENTIALS });
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid || !user.isActive) {
    throw createError({ statusCode: 401, statusMessage: INVALID_CREDENTIALS });
  }

  user.lastLoginAt = new Date();
  if (needsRehash(user.passwordHash)) {
    user.passwordHash = await hashPassword(input.password);
  }
  await user.save();

  const plain = user.toObject() as Partial<IUser>;
  delete plain.passwordHash;
  return plain as IUser;
}

/**
 * Creates an admin, or promotes an existing account and resets its password.
 * Only reachable from the CLI script — there is no HTTP route that grants roles.
 */
export async function upsertAdmin(input: {
  email: string;
  name: string;
  password: string;
}) {
  const passwordHash = await hashPassword(input.password);
  const role: UserRole = "admin";
  const user = await User.findOneAndUpdate(
    { email: input.email },
    {
      $set: { role, passwordHash, isActive: true },
      $setOnInsert: { name: input.name },
    },
    { upsert: true, returnDocument: "after", runValidators: true },
  );
  return user;
}
