import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { Loan } from "../../models/Loan";
import { Hold } from "../../models/Hold";
import { Item } from "../../models/Item";

export function createStatsRouter() {
  const router = Router();
  const staff = requireRole("librarian", "branch_admin", "super_admin");

  router.get("/", requireAuth, staff, async (_req, res, next) => {
    try {
      const now = new Date();
      const [overdueCount, activeLoans, readyHolds, catalogCount, mostBorrowed] = await Promise.all([
        Loan.countDocuments({ status: { $in: ["active", "overdue"] }, dueAt: { $lt: now } }),
        Loan.countDocuments({ status: { $in: ["active", "overdue"] } }),
        Hold.countDocuments({ status: "ready" }),
        Item.countDocuments(),
        Loan.aggregate<{ _id: unknown; count: number }>([
          { $group: { _id: "$itemId", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
      ]);

      const items = await Item.find({ _id: { $in: mostBorrowed.map((row) => row._id) } }).select("title itemType");
      const itemMap = new Map(items.map((item) => [String(item._id), item]));

      res.json({
        overdueCount,
        activeLoans,
        readyHolds,
        catalogCount,
        mostBorrowed: mostBorrowed.map((row) => ({
          itemId: String(row._id),
          title: itemMap.get(String(row._id))?.title ?? "Unknown title",
          itemType: itemMap.get(String(row._id))?.itemType,
          loanCount: row.count,
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
