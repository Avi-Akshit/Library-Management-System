import { NextFunction, Request, Response } from "express";
import { AuthService } from "../modules/auth/authService";
import { Role } from "../types";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        roles: Role[];
        branchId?: string;
      };
    }
  }
}

const authService = new AuthService();

export function attachAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.header("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = authService.verifyToken(authHeader.slice(7));
      req.auth = {
        userId: payload.userId,
        roles: payload.roles,
        branchId: payload.branchId,
      };
    } catch {
      // Invalid token — leave unauthenticated; requireAuth will reject protected routes.
    }
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}
