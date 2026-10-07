import { Schema, model, InferSchemaType } from "mongoose";

const roomSchema = new Schema({ name: { type: String, required: true, unique: true, trim: true }, capacity: { type: Number, required: true, min: 1 }, isEnabled: { type: Boolean, default: true } }, { timestamps: true });
export type RoomDocument = InferSchemaType<typeof roomSchema>;
export const Room = model("Room", roomSchema);
