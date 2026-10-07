import { Schema, model, InferSchemaType } from "mongoose";

const auditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: String },
    metadata: { type: Schema.Types.Mixed },
    ip: { type: String },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });

export type AuditLogDocument = InferSchemaType<typeof auditLogSchema>;
export const AuditLog = model("AuditLog", auditLogSchema);
