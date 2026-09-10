import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import authRoutes from "./modules/auth/auth.routes.js";
import destinationRoutes from "./modules/destinations/destination.routes.js";
import guideRoutes from "./modules/guides/guide.routes.js";
import guideManageRoutes from "./modules/guides/guide.manage.routes.js";
import bookingRoutes from "./modules/bookings/booking.routes.js";
import intelligenceRoutes from "./modules/intelligence/intelligence.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import { errorHandler } from "./shared/errors.js";

export function createApp() {
  const app = express(); app.set("trust proxy", 1);
  app.use((req, res, next) => { const startedAt = Date.now(); res.on("finish", () => console.info(JSON.stringify({ method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - startedAt }))); next(); });
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true })); app.use(express.json({ limit: "1mb" })); app.use(cookieParser());
  app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: "draft-7", legacyHeaders: false }));
  app.get("/health", (_req, res) => res.json({ data: { status: "ok" } }));
  app.use("/api/v1/auth", authRoutes); app.use("/api/v1/destinations", destinationRoutes); app.use("/api/v1/guides", guideManageRoutes); app.use("/api/v1/guides", guideRoutes); app.use("/api/v1/bookings", bookingRoutes); app.use("/api/v1/intelligence", intelligenceRoutes); app.use("/api/v1/admin", adminRoutes);
  app.use(errorHandler); return app;
}
