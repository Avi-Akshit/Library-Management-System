import { NextFunction, Request, Response } from "express";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit({ windowMs, max }: { windowMs: number; max: number }) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === "test") {
      next();
      return;
    }
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > max) {
      res.status(429).json({ error: "Too many requests" });
      return;
    }

    next();
  };
}

export const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
