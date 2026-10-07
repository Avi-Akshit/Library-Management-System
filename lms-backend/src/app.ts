import express from "express";
import { apiReference } from "@scalar/express-api-reference";
import cors from "cors";
import { config } from "./config";
import { openApiSpec } from "./openapi/spec";
import { attachAuth } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";
import { rateLimit } from "./middleware/rateLimit";
import { requestLogger } from "./middleware/requestLogger";
import { registerNotificationListeners } from "./modules/notifications/listeners";
import { createAuthRouter } from "./modules/auth/authRoutes";
import { createCatalogRouter } from "./modules/catalog/catalogRoutes";
import { createCirculationRouter } from "./modules/circulation/circulationRoutes";
import { createHoldRouter } from "./modules/holds/holdRoutes";
import { createFineRouter } from "./modules/fines/fineRoutes";
import { createPolicyRouter } from "./modules/policies/policyRoutes";
import { createUserRouter } from "./modules/users/userRoutes";
import { createNotificationRouter, createAuditRouter } from "./modules/notifications/notificationRoutes";
import { createSearchRouter } from "./modules/search/searchRoutes";
import { createStatsRouter } from "./modules/stats/statsRoutes";
import { createInterestRouter } from "./modules/interests/interestRoutes";
import { createIssueRouter } from "./modules/issues/issueRoutes";
import { createRoomRouter } from "./modules/rooms/roomRoutes";
import { createAssistantRouter } from "./modules/assistant/assistantRoutes";
import { createBranchRouter } from "./modules/branches/branchRoutes";

registerNotificationListeners();

export function createApp() {
  const app = express();

  app.use(cors({ origin: [config.webOrigin, "http://localhost:3001"], credentials: true }));
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    next();
  });
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);
  app.use(rateLimit({ windowMs: 60_000, max: process.env.NODE_ENV === "test" ? 10_000 : 120 }));
  app.use(attachAuth);

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "lms-api",
      checkedAt: new Date().toISOString(),
    });
  });

  app.get("/", (_req, res) => {
    res.json({
      service: "lms-api",
      docs: "/docs",
      openapi: "/openapi.json",
      health: "/health",
    });
  });

  app.get("/openapi.json", (_req, res) => res.json(openApiSpec));
  app.use(
    "/docs",
    apiReference({
      spec: { content: openApiSpec },
      theme: "default",
    }),
  );

  app.use("/auth", createAuthRouter());
  app.use("/catalog", createCatalogRouter());
  app.use("/circulation", createCirculationRouter());
  app.use("/holds", createHoldRouter());
  app.use("/fines", createFineRouter());
  app.use("/policies", createPolicyRouter());
  app.use("/users", createUserRouter());
  app.use("/notifications", createNotificationRouter());
  app.use("/audit", createAuditRouter());
  app.use("/search", createSearchRouter());
  app.use("/stats", createStatsRouter());
  app.use("/interests", createInterestRouter());
  app.use("/issues", createIssueRouter());
  app.use("/rooms", createRoomRouter());
  app.use("/assistant", createAssistantRouter());
  app.use("/branches", createBranchRouter());

  app.use(errorHandler);
  return app;
}
