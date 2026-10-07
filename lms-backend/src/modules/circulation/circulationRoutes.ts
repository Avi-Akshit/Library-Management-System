import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { auditAction } from "../../middleware/audit";
import { validateBody } from "../../middleware/validate";
import { requireRole, requireSelfOrStaff } from "../../middleware/rbac";
import { CirculationService } from "./circulationService";

const checkoutSchema = z.object({
  userId: z.string(),
  itemId: z.string().optional(),
  barcode: z.string().trim().min(1).optional(),
}).refine((value) => Boolean(value.itemId || value.barcode), { message: "An item ID or barcode is required" });

export function createCirculationRouter(circulation = new CirculationService()) {
  const router = Router();

  router.post(
    "/checkouts",
    requireAuth,
    requireRole("librarian", "branch_admin", "super_admin"),
    validateBody(checkoutSchema),
    auditAction("circulation.checkout", "Loan"),
    async (req, res, next) => {
      try {
        const loan = await circulation.checkout({
          userId: req.body.userId,
          itemId: req.body.itemId,
          barcode: req.body.barcode,
          branchId: req.auth?.branchId,
        });
        res.status(201).json(loan);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/returns/:loanId",
    requireAuth,
    requireRole("librarian", "branch_admin", "super_admin"),
    auditAction("circulation.return", "Loan"),
    async (req, res, next) => {
      try {
        res.json(
          await circulation.returnLoan({
            loanId: String(req.params.loanId),
            actorId: req.auth?.userId,
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/renewals/:loanId",
    requireAuth,
    requireRole("librarian", "branch_admin", "super_admin"),
    auditAction("circulation.renew", "Loan"),
    async (req, res, next) => {
      try {
        res.json(
          await circulation.renewLoan({
            loanId: String(req.params.loanId),
            actorId: req.auth?.userId,
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get("/loans/user/:userId", requireAuth, requireSelfOrStaff("userId"), async (req, res, next) => {
    try {
      res.json(await circulation.getActiveLoansForUser(String(req.params.userId)));
    } catch (error) {
      next(error);
    }
  });

  router.get(
    "/loans/overdue",
    requireAuth,
    requireRole("librarian", "branch_admin", "super_admin"),
    async (_req, res, next) => {
      try {
        res.json(await circulation.getOverdueLoans());
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
