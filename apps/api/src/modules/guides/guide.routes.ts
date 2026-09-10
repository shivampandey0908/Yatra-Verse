import { Router } from "express";
import { guideQuerySchema } from "@yatra-verse/contracts";
import { GuideModel } from "./guide.model.js";
import { validate } from "../../shared/validate.js";
import { AppError } from "../../shared/errors.js";

const router = Router();
router.get("/", validate(guideQuerySchema, "query"), async (req, res, next) => { try {
  const { destination, language, page, limit } = req.query as unknown as { destination?: string; language?: string; page: number; limit: number };
  const filter: Record<string, unknown> = { verificationStatus: "approved", visibility: "published" };
  if (destination) filter.destinationIds = destination;
  if (language) filter.languages = new RegExp(`^${language}$`, "i");
  const [items, total] = await Promise.all([GuideModel.find(filter).populate("userId", "name").populate("destinationIds", "name slug state").sort({ "rating.average": -1 }).skip((page - 1) * limit).limit(limit).lean(), GuideModel.countDocuments(filter)]);
  res.json({ data: items, meta: { page, limit, total } });
} catch (e) { next(e); } });
router.get("/:id", async (req, res, next) => { try { const item = await GuideModel.findOne({ _id: req.params.id, verificationStatus: "approved", visibility: "published" }).populate("userId", "name").populate("destinationIds", "name slug state").lean(); if (!item) throw new AppError(404, "GUIDE_NOT_FOUND", "Guide not found."); res.json({ data: item }); } catch (e) { next(e); } });
export default router;
