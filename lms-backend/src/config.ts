import dotenv from "dotenv";

dotenv.config();

const nodeEnv = process.env.NODE_ENV ?? "development";

if (nodeEnv === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set when NODE_ENV is production");
}

export const config = {
  nodeEnv,
  port: Number(process.env.PORT ?? 4000),
  mongodbUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/lms",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-secret",
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  emailProvider: process.env.EMAIL_PROVIDER ?? "console",
  gmailUser: process.env.GMAIL_USER,
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD,
  skipDb: process.env.SKIP_DB === "true",
};
