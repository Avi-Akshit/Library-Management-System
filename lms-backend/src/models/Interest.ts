import { Schema, model, InferSchemaType } from "mongoose";

const interestSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    itemId: { type: Schema.Types.ObjectId, ref: "Item", index: true },
    requestedTitle: { type: String, trim: true },
    reason: { type: String, enum: ["availability", "acquisition"], required: true },
  },
  { timestamps: true },
);

interestSchema.index({ userId: 1, itemId: 1, reason: 1 }, { unique: true, sparse: true });
interestSchema.index({ requestedTitle: 1, reason: 1 });

export type InterestDocument = InferSchemaType<typeof interestSchema>;
export const Interest = model("Interest", interestSchema);
