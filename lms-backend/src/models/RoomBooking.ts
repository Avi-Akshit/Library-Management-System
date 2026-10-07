import { Schema, model, InferSchemaType } from "mongoose";

const bookingSchema = new Schema({ roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true }, userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, startsAt: { type: Date, required: true }, endsAt: { type: Date, required: true } }, { timestamps: true });
bookingSchema.index({ roomId: 1, startsAt: 1 }, { unique: true });
export type RoomBookingDocument = InferSchemaType<typeof bookingSchema>;
export const RoomBooking = model("RoomBooking", bookingSchema);
