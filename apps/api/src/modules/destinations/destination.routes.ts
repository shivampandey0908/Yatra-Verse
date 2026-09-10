import { Router } from "express";
import { destinationQuerySchema } from "@yatra-verse/contracts";
import { DestinationModel } from "./destination.model.js";
import { validate } from "../../shared/validate.js";
import { AppError } from "../../shared/errors.js";

const router = Router();
router.get("/", validate(destinationQuerySchema, "query"), async (req, res, next) => { try {
  const { q, page, limit } = req.query as unknown as { q?: string; page: number; limit: number };
  const filter: Record<string, unknown> = { status: "published" };
  if (q) filter.$or = [{ name: new RegExp(q, "i") }, { state: new RegExp(q, "i") }, { tags: new RegExp(q, "i") }];
  const [items, total] = await Promise.all([DestinationModel.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(), DestinationModel.countDocuments(filter)]);
  res.json({ data: items, meta: { page, limit, total } });
} catch (e) { next(e); } });
router.get("/:slug", async (req, res, next) => { try { const item = await DestinationModel.findOne({ slug: req.params.slug, status: "published" }).lean(); if (!item) throw new AppError(404, "DESTINATION_NOT_FOUND", "Destination not found."); res.json({ data: item }); } catch (e) { next(e); } });
export default router;
