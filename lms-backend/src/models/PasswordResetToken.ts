import { InferSchemaType, model, Schema } from "mongoose";

const passwordResetTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    usedAt: { type: Date },
  },
  { timestamps: true },
);

export type PasswordResetTokenDocument = InferSchemaType<typeof passwordResetTokenSchema>;
export const PasswordResetToken = model("PasswordResetToken", passwordResetTokenSchema);
