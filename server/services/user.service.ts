import { createError } from "h3";
import type { Types } from "mongoose";
import type { ProfileUpdateInput } from "../../shared/schemas/auth";
import { User } from "../db/models";

export function serializeProfile(user: {
  _id: Types.ObjectId;
  email: string;
  name: string;
  role: string;
  phone?: string;
  defaultAddress?: unknown;
  createdAt?: Date;
}) {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone ?? null,
    defaultAddress: user.defaultAddress ?? null,
    createdAt: user.createdAt ?? null,
  };
}

export async function getProfile(userId: Types.ObjectId) {
  const user = await User.findById(userId).lean();
  if (!user)
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  return serializeProfile(user);
}

/** Applies only the validated fields; `null` removes an optional field. */
export async function updateProfile(
  userId: Types.ObjectId,
  input: ProfileUpdateInput,
) {
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, ""> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (value === null) $unset[key] = "";
    else $set[key] = value;
  }

  const update: Record<string, unknown> = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;

  const user = await User.findByIdAndUpdate(userId, update, {
    returnDocument: "after",
    runValidators: true,
  }).lean();
  if (!user)
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  return serializeProfile(user);
}
