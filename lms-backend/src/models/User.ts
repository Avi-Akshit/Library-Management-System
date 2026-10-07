import { Schema, model, InferSchemaType } from "mongoose";
import { memberTypes, roles } from "../types";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    roles: [{ type: String, enum: roles, required: true }],
    memberType: { type: String, enum: memberTypes, required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

userSchema.index({ roles: 1, memberType: 1 });
userSchema.index({ username: 1 }, { unique: true, sparse: true });

export type UserDocument = InferSchemaType<typeof userSchema>;
export const User = model("User", userSchema);
