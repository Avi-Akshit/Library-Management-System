import mongoose from "mongoose";
import { config } from "./config";

export async function connectDatabase(uri = config.mongodbUri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  await mongoose.connection.syncIndexes();
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
