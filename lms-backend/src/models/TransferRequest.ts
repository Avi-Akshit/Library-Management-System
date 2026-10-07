import { Schema, model, InferSchemaType } from "mongoose";

const transferRequestSchema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    copyId: { type: Schema.Types.ObjectId, required: true },
    fromBranchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    toBranchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    holdId: { type: Schema.Types.ObjectId, ref: "Hold" },
    status: { type: String, enum: ["requested", "in_transit", "received", "cancelled"], default: "requested" },
  },
  { timestamps: true },
);

transferRequestSchema.index({ status: 1, toBranchId: 1 });

export type TransferRequestDocument = InferSchemaType<typeof transferRequestSchema>;
export const TransferRequest = model("TransferRequest", transferRequestSchema);
