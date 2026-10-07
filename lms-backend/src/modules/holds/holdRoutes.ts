import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { auditAction } from "../../middleware/audit";
import { validateBody } from "../../middleware/validate";
import { requireRole, requireSelfOrStaff } from "../../middleware/rbac";
import { HoldService } from "./holdService";
import { Hold } from "../../models/Hold";

const placeHoldSchema = z.object({
  itemId: z.string(),
  pickupBranchId: z.string().optional(),
  userId: z.string().optional(),
});

export function createHoldRouter(holds = new HoldService()) {
  const router = Router();

  router.post("/", requireAuth, validateBody(placeHoldSchema), auditAction("hold.place", "Hold"), async (req, res, next) => {
    try {
      const hold = await holds.placeHold({
        userId: req.auth?.userId ?? req.body.userId,
        itemId: req.body.itemId,
        pickupBranchId: req.body.pickupBranchId,
      });
      res.status(201).json(hold);
    } catch (error) {
      next(error);
    }
  });

  router.get("/user/:userId", requireAuth, requireSelfOrStaff("userId"), async (req, res, next) => {
    try {
      res.json(
        await Hold.find({ userId: req.params.userId, status: { $in: ["queued", "ready"] } }).sort({
          createdAt: -1,
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:holdId", requireAuth, auditAction("hold.cancel", "Hold"), async (req, res, next) => {
    try {
      const isStaff = req.auth!.roles.some((r) =>
        ["librarian", "branch_admin", "super_admin"].includes(r),
      );
      res.json(
        await holds.cancelHold({
          holdId: String(req.params.holdId),
          userId: req.auth!.userId,
          isStaff,
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  router.get(
    "/queue/:itemId",
    requireAuth,
    requireRole("librarian", "branch_admin", "super_admin"),
    async (req, res, next) => {
      try {
        res.json(
          await Hold.find({ itemId: req.params.itemId, status: { $in: ["queued", "ready"] } }).sort({
            position: 1,
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
