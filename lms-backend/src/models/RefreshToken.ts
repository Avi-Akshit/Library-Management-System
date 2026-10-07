import { Schema, model, InferSchemaType } from "mongoose";

const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

refreshTokenSchema.index({ userId: 1, revoked: 1 });

export type RefreshTokenDocument = InferSchemaType<typeof refreshTokenSchema>;
export const RefreshToken = model("RefreshToken", refreshTokenSchema);
