import { Schema, model, InferSchemaType } from "mongoose";

const fineLedgerEntrySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    loanId: { type: Schema.Types.ObjectId, ref: "Loan" },
    type: { type: String, enum: ["fine", "payment", "waiver", "adjustment"], required: true },
    amountCents: { type: Number, required: true },
    reason: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

fineLedgerEntrySchema.index({ userId: 1, createdAt: -1 });

export type FineLedgerEntryDocument = InferSchemaType<typeof fineLedgerEntrySchema>;
export const FineLedgerEntry = model("FineLedgerEntry", fineLedgerEntrySchema);
