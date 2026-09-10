import { Router } from "express";
import { z } from "zod";
import { GuideModel } from "./guide.model.js";
import { authenticate, authorize } from "../../shared/auth.js";
import { validate } from "../../shared/validate.js";
import { AppError } from "../../shared/errors.js";

const router = Router();
const packageSchema = z.object({ title: z.string().trim().min(3).max(120), durationHours: z.number().positive().max(240), price: z.number().nonnegative().max(1_000_000), inclusions: z.array(z.string().trim().min(1).max(100)).max(20), exclusions: z.array(z.string().trim().min(1).max(100)).max(20), active: z.boolean().default(true) });
const profileSchema = z.object({ bio: z.string().trim().max(2000), residenceState: z.string().trim().max(80), serviceStates: z.array(z.string().trim().min(1).max(80)).max(36), languages: z.array(z.string().trim().min(1).max(50)).max(12), specialties: z.array(z.string().trim().min(1).max(50)).max(12), destinationIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(30), pricePerDay: z.number().nonnegative().max(1_000_000).optional(), packages: z.array(packageSchema).max(20).default([]) });
router.get("/me/profile", authenticate, authorize("guide"), async (req, res, next) => { try { const profile = await GuideModel.findOne({ userId: req.auth!.id }).lean(); res.json({ data: profile }); } catch (e) { next(e); } });
router.put("/me/profile", authenticate, authorize("guide"), validate(profileSchema), async (req, res, next) => { try { const profile = await GuideModel.findOneAndUpdate({ userId: req.auth!.id }, { $set: req.body }, { upsert: true, new: true, runValidators: true }); res.json({ data: profile }); } catch (e) { next(e); } });
router.post("/me/verification", authenticate, authorize("guide"), async (req, res, next) => { try { const profile = await GuideModel.findOneAndUpdate({ userId: req.auth!.id, verificationStatus: { $in: ["not_started", "rejected"] } }, { $set: { verificationStatus: "pending", visibility: "draft" } }, { new: true }); if (!profile) throw new AppError(409, "VERIFICATION_UNAVAILABLE", "This verification request cannot be submitted now."); res.json({ data: profile }); } catch (e) { next(e); } });
export default router;
