import { Schema, model, InferSchemaType } from "mongoose";

const branchSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    address: { type: String, required: true },
  },
  { timestamps: true },
);

export type BranchDocument = InferSchemaType<typeof branchSchema>;
export const Branch = model("Branch", branchSchema);
