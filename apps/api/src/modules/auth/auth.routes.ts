import { Router } from "express";
import argon2 from "argon2";
import crypto from "node:crypto";
import { loginSchema, registerSchema } from "@yatra-verse/contracts";
import { UserModel } from "../users/user.model.js";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors.js";
import { authenticate, signAccessToken, signRefreshToken } from "../../shared/auth.js";
import { validate } from "../../shared/validate.js";

const router = Router();
const cookieOptions = { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "lax" as const, path: "/api/v1/auth", maxAge: 7 * 24 * 60 * 60 * 1000 };
const serialize = (user: { _id: unknown; name: string; email: string; roles: string[] }) => ({ id: String(user._id), name: user.name, email: user.email, roles: user.roles });
async function issueSession(user: any, res: any) {
  const sessionId = crypto.randomUUID(); const refresh = signRefreshToken({ id: String(user._id), roles: user.roles }, sessionId);
  user.sessions.push({ id: sessionId, tokenHash: await argon2.hash(refresh), expiresAt: new Date(Date.now() + cookieOptions.maxAge) }); await user.save();
  res.cookie("yv_refresh", refresh, cookieOptions); return signAccessToken({ id: String(user._id), roles: user.roles });
}
router.post("/register", validate(registerSchema), async (req, res, next) => { try {
  const { name, email, password, role } = req.body; if (await UserModel.exists({ email: email.toLowerCase() })) throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists.");
  const user = await UserModel.create({ name, email, passwordHash: await argon2.hash(password), roles: role === "guide" ? ["traveler", "guide"] : ["traveler"] });
  res.status(201).json({ data: { user: serialize(user), accessToken: await issueSession(user, res) } });
} catch (e) { next(e); } });
router.post("/login", validate(loginSchema), async (req, res, next) => { try {
  const user = await UserModel.findOne({ email: req.body.email.toLowerCase() }).select("+passwordHash");
  if (!user || !(await argon2.verify(user.passwordHash, req.body.password))) throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  if (user.status !== "active") throw new AppError(403, "ACCOUNT_UNAVAILABLE", "This account is unavailable.");
  res.json({ data: { user: serialize(user), accessToken: await issueSession(user, res) } });
} catch (e) { next(e); } });
router.get("/me", authenticate, async (req, res, next) => { try { const user = await UserModel.findById(req.auth!.id); if (!user) throw new AppError(401, "UNAUTHENTICATED", "Account not found."); res.json({ data: { user: serialize(user) } }); } catch (e) { next(e); } });
router.post("/logout", (_req, res) => { res.clearCookie("yv_refresh", cookieOptions); res.status(204).send(); });
export default router;
