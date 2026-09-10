import { Router } from "express";
import { bookingSchema } from "@yatra-verse/contracts";
import { BookingModel } from "./booking.model.js";
import { GuideModel } from "../guides/guide.model.js";
import { DestinationModel } from "../destinations/destination.model.js";
import { authenticate } from "../../shared/auth.js";
import { validate } from "../../shared/validate.js";
import { AppError } from "../../shared/errors.js";

const router = Router();
router.post("/", authenticate, validate(bookingSchema), async (req, res, next) => { try {
  const { guideId, destinationId, startsAt, endsAt, guests, note } = req.body;
  if (new Date(endsAt) <= new Date(startsAt)) throw new AppError(400, "INVALID_TIME_RANGE", "The end time must be after the start time.");
  const [guide, destination] = await Promise.all([GuideModel.findOne({ _id: guideId, verificationStatus: "approved", visibility: "published" }), DestinationModel.findOne({ _id: destinationId, status: "published" })]);
  if (!guide || !destination) throw new AppError(404, "RESOURCE_NOT_FOUND", "The guide or destination is unavailable.");
  const conflict = await BookingModel.exists({ guideId, status: { $in: ["pending_payment", "confirmed"] }, startsAt: { $lt: new Date(endsAt) }, endsAt: { $gt: new Date(startsAt) } });
  if (conflict) throw new AppError(409, "GUIDE_UNAVAILABLE", "This guide is no longer available for that time.");
  const booking = await BookingModel.create({ travelerId: req.auth!.id, guideId, destinationId, startsAt, endsAt, guests, note, priceSnapshot: { amount: guide.pricePerDay ?? 0, currency: guide.currency } });
  res.status(201).json({ data: booking });
} catch (e) { next(e); } });
router.get("/mine", authenticate, async (req, res, next) => { try { const items = await BookingModel.find({ travelerId: req.auth!.id }).populate("guideId").populate("destinationId", "name slug state").sort({ createdAt: -1 }).lean(); res.json({ data: items }); } catch (e) { next(e); } });
export default router;
