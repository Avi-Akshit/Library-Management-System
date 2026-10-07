import { Schema, model, InferSchemaType } from "mongoose";

const loanSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true, index: true },
    copyId: { type: Schema.Types.ObjectId, required: true },
    checkoutAt: { type: Date, required: true },
    dueAt: { type: Date, required: true, index: true },
    returnedAt: { type: Date },
    renewalCount: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "returned", "overdue"], default: "active", index: true },
  },
  { timestamps: true },
);

loanSchema.index(
  { itemId: 1, copyId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "active" } },
);

export type LoanDocument = InferSchemaType<typeof loanSchema>;
export const Loan = model("Loan", loanSchema);
