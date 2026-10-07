import { NextFunction, Request, Response } from "express";
import { Role } from "../types";

export function requireRole(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!req.auth.roles.some((role) => allowed.includes(role))) {
      res.status(403).json({ error: "Insufficient role" });
      return;
    }

    next();
  };
}

export function requireBranchAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (req.auth.roles.includes("super_admin")) {
    next();
    return;
  }

  if (!req.auth.roles.includes("branch_admin")) {
    res.status(403).json({ error: "Branch admin access required" });
    return;
  }

  next();
}

/**
 * Ensures a branch_admin can only act on resources scoped to their own branch.
 * Reads the target branchId from req.params.branchId or req.body.branchId.
 * super_admin always passes through.
 */
export function requireBranchSelf(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (req.auth.roles.includes("super_admin")) {
    next();
    return;
  }

  if (!req.auth.roles.includes("branch_admin")) {
    res.status(403).json({ error: "Branch admin access required" });
    return;
  }

  const targetBranchId = String(
    req.params.branchId ?? req.body?.branchId ?? "",
  );

  if (!req.auth.branchId || req.auth.branchId !== targetBranchId) {
    res.status(403).json({ error: "Access restricted to your own branch" });
    return;
  }

  next();
}

export function requireSelfOrStaff(paramName = "userId") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const targetId = String(req.params[paramName] ?? req.body?.userId ?? "");
    const isStaff = req.auth.roles.some((r) =>
      ["librarian", "branch_admin", "super_admin"].includes(r),
    );

    if (isStaff || req.auth.userId === targetId) {
      next();
      return;
    }

    res.status(403).json({ error: "Access denied" });
  };
}
