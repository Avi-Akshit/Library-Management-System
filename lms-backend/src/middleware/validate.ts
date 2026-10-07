import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { ApiError } from "./errorHandler";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new ApiError(400, result.error.issues.map((i) => i.message).join("; ")));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(new ApiError(400, result.error.issues.map((i) => i.message).join("; ")));
      return;
    }
    req.query = result.data as typeof req.query;
    next();
  };
}
