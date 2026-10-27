import { Schema, type Types } from "mongoose";
import { cleanJson, defineModel, imageSchema, type ImageRef } from "./_shared";

export interface ICategory {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  image?: ImageRef;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 100,
    },
    description: { type: String, trim: true, maxlength: 1000 },
    image: { type: imageSchema },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { transform: cleanJson } },
);

categorySchema.index({ isActive: 1, sortOrder: 1, name: 1 });

export const Category = defineModel<ICategory>("Category", categorySchema);
