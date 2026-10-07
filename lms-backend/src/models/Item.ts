import { Schema, model, InferSchemaType } from "mongoose";
import { itemTypes } from "../types";

const copySchema = new Schema(
  {
    barcode: { type: String, required: true, unique: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    status: {
      type: String,
      enum: ["available", "checked_out", "reserved", "in_transfer", "lost", "maintenance"],
      default: "available",
      index: true,
    },
    shelfLocation: { type: String, trim: true },
  },
  { _id: true },
);

const itemSchema = new Schema(
  {
    itemType: { type: String, enum: itemTypes, required: true },
    workId: { type: Schema.Types.ObjectId, ref: "Work", index: true },
    format: { type: String, trim: true },
    language: { type: String, default: "en", trim: true },
    genres: [{ type: String, trim: true }],
    subcategory: { type: String, trim: true },
    donatedBy: { type: String, trim: true, maxlength: 160 },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    creators: [{ type: String, trim: true }],
    subjects: [{ type: String, trim: true }],
    description: { type: String, trim: true },
    isbn: { type: String, trim: true, sparse: true },
    publicationYear: { type: Number },
    copies: [copySchema],
    embedding: [{ type: Number }],
  },
  { timestamps: true, discriminatorKey: "itemType" },
);

itemSchema.index({
  title: "text",
  subtitle: "text",
  creators: "text",
  subjects: "text",
  description: "text",
});
itemSchema.index({ itemType: 1, "copies.status": 1 });

export type ItemDocument = InferSchemaType<typeof itemSchema>;
export const Item = model("Item", itemSchema);

export const Book = Item.discriminator(
  "book",
  new Schema({
    edition: String,
    publisher: String,
    pageCount: Number,
  }),
);

export const Journal = Item.discriminator(
  "journal",
  new Schema({
    volume: String,
    issue: String,
    issn: String,
  }),
);

export const Media = Item.discriminator(
  "media",
  new Schema({
    format: { type: String, enum: ["dvd", "bluray", "audio", "digital"] },
    runtimeMinutes: Number,
  }),
);

export const Equipment = Item.discriminator(
  "equipment",
  new Schema({
    serialNumber: String,
    replacementCost: Number,
  }),
);
