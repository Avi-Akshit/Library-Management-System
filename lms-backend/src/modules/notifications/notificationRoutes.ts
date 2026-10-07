import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { Notification } from "../../models/Notification";
import { AuditLog } from "../../models/AuditLog";
import { requireBranchAdmin } from "../../middleware/rbac";

export function createNotificationRouter() {
  const router = Router();

  router.get("/", requireAuth, async (req, res, next) => {
    try {
      const unreadOnly = req.query.unread === "true";
      const filter: Record<string, unknown> = { userId: req.auth!.userId };
      if (unreadOnly) filter.readAt = { $exists: false };
      res.json(await Notification.find(filter).sort({ createdAt: -1 }).limit(50));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id/read", requireAuth, async (req, res, next) => {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, userId: req.auth!.userId },
        { readAt: new Date() },
        { returnDocument: "after" },
      );
      if (!notification) {
        res.status(404).json({ error: "Notification not found" });
        return;
      }
      res.json(notification);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function createAuditRouter() {
  const router = Router();

  router.get("/", requireAuth, requireBranchAdmin, async (_req, res, next) => {
    try {
      res.json(await AuditLog.find().sort({ createdAt: -1 }).limit(100));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
