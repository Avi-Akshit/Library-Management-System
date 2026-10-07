import { Request, Response, NextFunction } from "express";
import { AuditLog } from "../models/AuditLog";

export function auditAction(action: string, targetType: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on("finish", () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        void AuditLog.create({
          actorId: req.auth?.userId,
          action,
          targetType,
          targetId: req.params.id ? String(req.params.id) : req.body?.id ? String(req.body.id) : undefined,
          metadata: { method: req.method, path: req.originalUrl },
          ip: req.ip,
        }).catch(() => undefined);
      }
    });
    next();
  };
}
