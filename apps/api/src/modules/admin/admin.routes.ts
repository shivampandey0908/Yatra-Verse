import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../shared/auth.js";
import { validate } from "../../shared/validate.js";
import { DestinationModel } from "../destinations/destination.model.js";
import { GuideModel } from "../guides/guide.model.js";
import { AppError } from "../../shared/errors.js";

const router = Router(); router.use(authenticate, authorize("admin"));
const destinationSchema = z.object({ name: z.string().trim().min(2).max(120), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), state: z.string().trim().min(2).max(100), country: z.string().trim().min(2).max(100).default("India"), summary: z.string().trim().min(30).max(500), description: z.string().trim().min(100).max(5000), heroImageUrl: z.string().url().optional(), coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]), tags: z.array(z.string().trim().min(1).max(50)).max(15), status: z.enum(["draft", "published"]).default("draft") });
router.post("/destinations", validate(destinationSchema), async (req, res, next) => { try { const { coordinates, ...data } = req.body; const item = await DestinationModel.create({ ...data, coordinates: { type: "Point", coordinates } }); res.status(201).json({ data: item }); } catch (e: any) { if (e?.code === 11000) return next(new AppError(409, "DESTINATION_EXISTS", "That destination slug already exists.")); next(e); } });
router.patch("/destinations/:id", validate(destinationSchema.partial()), async (req, res, next) => { try { const { coordinates, ...data } = req.body; const update = coordinates ? { ...data, coordinates: { type: "Point", coordinates } } : data; const item = await DestinationModel.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true }); if (!item) throw new AppError(404, "DESTINATION_NOT_FOUND", "Destination not found."); res.json({ data: item }); } catch (e) { next(e); } });
router.get("/guides/pending", async (_req, res, next) => { try { res.json({ data: await GuideModel.find({ verificationStatus: "pending" }).populate("userId", "name email").lean() }); } catch (e) { next(e); } });
router.patch("/guides/:id/verification", validate(z.object({ decision: z.enum(["approved", "rejected"]) })), async (req, res, next) => { try { const approved = req.body.decision === "approved"; const profile = await GuideModel.findOneAndUpdate({ _id: req.params.id, verificationStatus: "pending" }, { $set: { verificationStatus: req.body.decision, visibility: approved ? "published" : "draft" } }, { new: true }); if (!profile) throw new AppError(409, "VERIFICATION_UNAVAILABLE", "This verification decision cannot be applied."); res.json({ data: profile }); } catch (e) { next(e); } });
export default router;
