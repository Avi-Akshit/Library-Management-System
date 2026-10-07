import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { auditAction } from "../../middleware/audit";
import { validateBody } from "../../middleware/validate";
import { requireBranchAdmin } from "../../middleware/rbac";
import { User } from "../../models/User";
import { roles } from "../../types";

const updateRolesSchema = z.object({
  roles: z.array(z.enum(roles)).min(1),
});

function sanitize(user: {
  _id: unknown;
  name: string;
  email: string;
  roles: string[];
  memberType: string;
  branchId?: unknown;
  isActive: boolean;
}) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    roles: user.roles,
    memberType: user.memberType,
    branchId: user.branchId ? String(user.branchId) : undefined,
    isActive: user.isActive,
  };
}

export function createUserRouter() {
  const router = Router();

  // GET /users?q=search_term
  router.get("/", requireAuth, requireBranchAdmin, async (req, res, next) => {
    try {
      const q = String(req.query.q ?? "").trim();
      const filter = q
        ? {
            $or: [
              { name: { $regex: q, $options: "i" } },
              { email: { $regex: q, $options: "i" } },
            ],
          }
        : {};
      const users = await User.find(filter).select("-passwordHash").sort({ name: 1 }).limit(100);
      res.json(users.map(sanitize));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", requireAuth, requireBranchAdmin, async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id).select("-passwordHash");
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json(sanitize(user));
    } catch (error) {
      next(error);
    }
  });

  router.patch(
    "/:id/roles",
    requireAuth,
    requireBranchAdmin,
    validateBody(updateRolesSchema),
    auditAction("user.roles.update", "User"),
    async (req, res, next) => {
      try {
        const user = await User.findByIdAndUpdate(
          req.params.id,
          { roles: req.body.roles },
          { returnDocument: "after" },
        ).select("-passwordHash");
        if (!user) {
          res.status(404).json({ error: "User not found" });
          return;
        }
        res.json(sanitize(user));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
