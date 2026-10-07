import { Schema, model, InferSchemaType } from "mongoose";

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["due_reminder", "hold_ready", "overdue", "fine", "system"],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    readAt: { type: Date },
    delivery: {
      email: { type: String, enum: ["pending", "sent", "failed", "skipped"], default: "pending" },
      inApp: { type: String, enum: ["created"], default: "created" },
    },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

export type NotificationDocument = InferSchemaType<typeof notificationSchema>;
export const Notification = model("Notification", notificationSchema);
