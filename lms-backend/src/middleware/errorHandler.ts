import { NextFunction, Request, Response } from "express";

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  const message = process.env.NODE_ENV === "production"
    ? "Unexpected error"
    : error instanceof Error
      ? error.message
      : "Unexpected error";
  res.status(500).json({ error: message });
}
