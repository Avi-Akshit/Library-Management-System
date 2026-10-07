import { Schema, model, InferSchemaType } from "mongoose";
import { itemTypes, memberTypes } from "../types";

const loanPolicySchema = new Schema(
  {
    itemType: { type: String, enum: itemTypes, required: true },
    memberType: { type: String, enum: memberTypes, required: true },
    loanDays: { type: Number, required: true, min: 1 },
    renewalLimit: { type: Number, required: true, min: 0 },
    finePerDayCents: { type: Number, required: true, min: 0 },
    maxActiveLoans: { type: Number, required: true, min: 1 },
  },
  { timestamps: true },
);

loanPolicySchema.index({ itemType: 1, memberType: 1 }, { unique: true });

export type LoanPolicyDocument = InferSchemaType<typeof loanPolicySchema>;
export const LoanPolicy = model("LoanPolicy", loanPolicySchema);
