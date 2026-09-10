import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import type { UserRole } from "@yatra-verse/contracts";
import { env } from "../config/env.js";
import { AppError } from "./errors.js";

export type AuthUser = { id: string; roles: UserRole[] };
declare global { namespace Express { interface Request { auth?: AuthUser } } }

export function signAccessToken(user: AuthUser) { return jwt.sign(user, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL as SignOptions["expiresIn"] }); }
export function signRefreshToken(user: AuthUser, sessionId: string) { return jwt.sign({ ...user, sessionId }, env.JWT_REFRESH_SECRET, { expiresIn: env.REFRESH_TOKEN_TTL as SignOptions["expiresIn"] }); }
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next(new AppError(401, "UNAUTHENTICATED", "Authentication is required."));
  try { req.auth = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as AuthUser; next(); }
  catch { next(new AppError(401, "INVALID_TOKEN", "Your session has expired. Please sign in again.")); }
}
export const authorize = (...roles: UserRole[]) => (req: Request, _res: Response, next: NextFunction) => {
  if (!req.auth || !roles.some((role) => req.auth!.roles.includes(role))) return next(new AppError(403, "FORBIDDEN", "You do not have access to this resource."));
  next();
};
