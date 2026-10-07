import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validateBody } from "../../middleware/validate";
import { ApiError } from "../../middleware/errorHandler";
import { AuditLog } from "../../models/AuditLog";
import { Item } from "../../models/Item";
import { ItemIssue } from "../../models/ItemIssue";

const issueSchema = z.object({ copyId: z.string(), type: z.enum(["damaged", "missing_pages", "wrong_information", "other"]), note: z.string().max(1000).optional() });

export function createIssueRouter() {
  const router = Router();
  router.post("/items/:itemId", requireAuth, validateBody(issueSchema), async (req, res, next) => {
    try {
      const item = await Item.findById(req.params.itemId).select("copies._id");
      if (!item) throw new ApiError(404, "Item not found");
      const copyBelongsToItem = item.copies.some((copy) => String(copy._id) === req.body.copyId);
      if (!copyBelongsToItem) throw new ApiError(400, "Copy does not belong to this item");
      res.status(201).json(await ItemIssue.create({ ...req.body, itemId: req.params.itemId, reporterId: req.auth!.userId }));
    } catch (error) { next(error); }
  });
  router.get("/", requireAuth, requireRole("librarian", "branch_admin", "super_admin"), async (_req, res, next) => {
    try { res.json(await ItemIssue.find({ status: "open" }).sort({ createdAt: -1 })); } catch (error) { next(error); }
  });
  router.post("/:issueId/resolve", requireAuth, requireRole("librarian", "branch_admin", "super_admin"), async (req, res, next) => {
    try {
      const issue = await ItemIssue.findOneAndUpdate({ _id: req.params.issueId, status: "open" }, { status: "resolved", resolvedBy: req.auth!.userId, resolvedAt: new Date() }, { returnDocument: "after" });
      if (!issue) return res.status(404).json({ error: "Open issue not found" });
      await AuditLog.create({ actorId: req.auth!.userId, action: "item_issue.resolve", targetType: "ItemIssue", targetId: String(issue._id) });
      res.json(issue);
    } catch (error) { next(error); }
  });
  return router;
}
