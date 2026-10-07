import { Schema, model, InferSchemaType } from "mongoose";

const holdSchema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    pickupBranchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    position: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["queued", "ready", "fulfilled", "expired", "cancelled"],
      default: "queued",
      index: true,
    },
    readyAt: { type: Date },
    expiresAt: { type: Date },
  },
  { timestamps: true },
);

holdSchema.index({ itemId: 1, userId: 1, status: 1 });
holdSchema.index({ itemId: 1, position: 1, status: 1 });

export type HoldDocument = InferSchemaType<typeof holdSchema>;
export const Hold = model("Hold", holdSchema);
