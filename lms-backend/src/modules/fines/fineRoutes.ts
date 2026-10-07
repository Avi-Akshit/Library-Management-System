import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { auditAction } from "../../middleware/audit";
import { validateBody } from "../../middleware/validate";
import { requireRole, requireSelfOrStaff } from "../../middleware/rbac";
import { FineService } from "./fineService";
import { FineLedgerEntry } from "../../models/FineLedgerEntry";

const waiveSchema = z.object({
  userId: z.string(),
  amountCents: z.number().positive(),
  reason: z.string().min(1),
});

export function createFineRouter(fines = new FineService()) {
  const router = Router();

  router.get("/users/:userId/balance", requireAuth, requireSelfOrStaff("userId"), async (req, res, next) => {
    try {
      const userId = String(req.params.userId);
      res.json({ userId, balanceCents: await fines.balanceForUser(userId) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/users/:userId/ledger", requireAuth, requireSelfOrStaff("userId"), async (req, res, next) => {
    try {
      res.json(await FineLedgerEntry.find({ userId: req.params.userId }).sort({ createdAt: -1 }));
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/waive",
    requireAuth,
    requireRole("librarian", "branch_admin", "super_admin"),
    validateBody(waiveSchema),
    auditAction("fine.waive", "FineLedgerEntry"),
    async (req, res, next) => {
      try {
        res.status(201).json(
          await fines.waiveFine({
            userId: req.body.userId,
            amountCents: req.body.amountCents,
            reason: req.body.reason,
            actorId: req.auth?.userId,
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
