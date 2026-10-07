import { Schema, model, InferSchemaType } from "mongoose";

const itemIssueSchema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true, index: true },
    copyId: { type: Schema.Types.ObjectId, required: true },
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["damaged", "missing_pages", "wrong_information", "other"], required: true },
    note: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: ["open", "resolved"], default: "open", index: true },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    resolvedAt: { type: Date },
  },
  { timestamps: true },
);

export type ItemIssueDocument = InferSchemaType<typeof itemIssueSchema>;
export const ItemIssue = model("ItemIssue", itemIssueSchema);
