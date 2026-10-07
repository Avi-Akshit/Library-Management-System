import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { ApiError } from "../../middleware/errorHandler";
import { requireBranchSelf, requireRole } from "../../middleware/rbac";
import { validateBody } from "../../middleware/validate";
import { Branch } from "../../models/Branch";

const branchSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,20}$/),
  address: z.string().trim().min(2).max(300),
});

export function createBranchRouter() {
  const router = Router();
  router.get("/", requireAuth, async (_req, res, next) => {
    try { res.json(await Branch.find().sort({ name: 1 })); } catch (error) { next(error); }
  });
  router.post("/", requireAuth, requireRole("super_admin"), validateBody(branchSchema), async (req, res, next) => {
    try { res.status(201).json(await Branch.create(req.body)); } catch (error) { next(error); }
  });
  router.patch("/:branchId", requireAuth, requireBranchSelf, validateBody(branchSchema.partial()), async (req, res, next) => {
    try {
      const branch = await Branch.findByIdAndUpdate(req.params.branchId, req.body, { returnDocument: "after" });
      if (!branch) throw new ApiError(404, "Library location not found");
      res.json(branch);
    } catch (error) { next(error); }
  });
  return router;
}
