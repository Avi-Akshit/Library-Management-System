import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validateBody } from "../../middleware/validate";
import { Interest } from "../../models/Interest";

const interestSchema = z.object({
  itemId: z.string().optional(),
  requestedTitle: z.string().trim().min(2).optional(),
  reason: z.enum(["availability", "acquisition"]),
}).refine((value) => Boolean(value.itemId || value.requestedTitle), { message: "An item or title is required" });

export function createInterestRouter() {
  const router = Router();
  router.post("/", requireAuth, validateBody(interestSchema), async (req, res, next) => {
    try {
      const payload = { ...req.body, userId: req.auth!.userId, requestedTitle: req.body.requestedTitle?.toLowerCase() };
      const interest = await Interest.findOneAndUpdate(
        { userId: payload.userId, itemId: payload.itemId, requestedTitle: payload.requestedTitle, reason: payload.reason },
        payload,
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
      );
      const demandFilter = payload.itemId ? { itemId: payload.itemId, reason: payload.reason } : { requestedTitle: payload.requestedTitle, reason: payload.reason };
      res.status(201).json({ interest, requesterCount: await Interest.countDocuments(demandFilter) });
    } catch (error) { next(error); }
  });

  router.get("/", requireAuth, requireRole("librarian", "branch_admin", "super_admin"), async (_req, res, next) => {
    try {
      const rows = await Interest.aggregate([
        { $group: { _id: { itemId: "$itemId", requestedTitle: "$requestedTitle", reason: "$reason" }, requesterCount: { $sum: 1 }, createdAt: { $min: "$createdAt" } } },
        { $sort: { requesterCount: -1, createdAt: -1 } },
      ]);
      res.json(rows);
    } catch (error) { next(error); }
  });
  return router;
}
