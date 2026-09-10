import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "./errors.js";

export const validate = (schema: ZodType, target: "body" | "query" = "body") => (req: Request, _res: Response, next: NextFunction) => {
  const parsed = schema.safeParse(req[target]);
  if (!parsed.success) return next(new AppError(400, "VALIDATION_ERROR", "Invalid request data."));
  Object.assign(req[target], parsed.data);
  next();
};
