import { Schema, type Types } from "mongoose";
import { USER_ROLES, type UserRole } from "../../../shared/constants";
import { addressSchema, cleanJson, defineModel, type Address } from "./_shared";

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  phone?: string;
  role: UserRole;
  defaultAddress?: Address;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    // Never returned unless explicitly selected with `+passwordHash`.
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, trim: true, maxlength: 30 },
    role: {
      type: String,
      enum: USER_ROLES,
      default: "customer",
      required: true,
    },
    defaultAddress: { type: addressSchema },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret: Record<string, unknown>) {
        delete ret.passwordHash;
        return cleanJson(doc, ret);
      },
    },
  },
);

userSchema.index({ role: 1, createdAt: -1 });

export const User = defineModel<IUser>("User", userSchema);
