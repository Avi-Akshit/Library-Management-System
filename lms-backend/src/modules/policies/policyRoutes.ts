import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { auditAction } from "../../middleware/audit";
import { validateBody } from "../../middleware/validate";
import { requireBranchAdmin } from "../../middleware/rbac";
import { LoanPolicy } from "../../models/LoanPolicy";
import { itemTypes, memberTypes } from "../../types";

const policySchema = z.object({
  itemType: z.enum(itemTypes),
  memberType: z.enum(memberTypes),
  loanDays: z.number().min(1),
  renewalLimit: z.number().min(0),
  finePerDayCents: z.number().min(0),
  maxActiveLoans: z.number().min(1),
});

export function createPolicyRouter() {
  const router = Router();

  router.get("/", requireAuth, requireBranchAdmin, async (_req, res, next) => {
    try {
      res.json(await LoanPolicy.find().sort({ itemType: 1, memberType: 1 }));
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/",
    requireAuth,
    requireBranchAdmin,
    validateBody(policySchema),
    auditAction("policy.create", "LoanPolicy"),
    async (req, res, next) => {
      try {
        const policy = await LoanPolicy.create(req.body);
        res.status(201).json(policy);
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/:id",
    requireAuth,
    requireBranchAdmin,
    validateBody(policySchema.partial()),
    auditAction("policy.update", "LoanPolicy"),
    async (req, res, next) => {
      try {
        const policy = await LoanPolicy.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
        if (!policy) {
          res.status(404).json({ error: "Policy not found" });
          return;
        }
        res.json(policy);
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/:id",
    requireAuth,
    requireBranchAdmin,
    auditAction("policy.delete", "LoanPolicy"),
    async (req, res, next) => {
      try {
        const policy = await LoanPolicy.findByIdAndDelete(req.params.id);
        if (!policy) {
          res.status(404).json({ error: "Policy not found" });
          return;
        }
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
