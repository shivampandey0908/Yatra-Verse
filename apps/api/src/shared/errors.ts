import type { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  const known = error instanceof AppError;
  const status = known ? error.status : 500;
  const code = known ? error.code : "INTERNAL_ERROR";
  const message = known ? error.message : "An unexpected error occurred.";
  if (status >= 500) console.error(error);
  res.status(status).json({ error: { code, message } });
}
