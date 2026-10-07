import { Schema, model, InferSchemaType } from "mongoose";

const workSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    creators: [{ type: String, trim: true }],
    subjects: [{ type: String, trim: true }],
  },
  { timestamps: true },
);

export type WorkDocument = InferSchemaType<typeof workSchema>;
export const Work = model("Work", workSchema);
