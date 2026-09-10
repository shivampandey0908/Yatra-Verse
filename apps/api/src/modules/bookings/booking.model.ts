import { Schema, model } from "mongoose";

const bookingSchema = new Schema({
  travelerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  guideId: { type: Schema.Types.ObjectId, ref: "GuideProfile", required: true },
  destinationId: { type: Schema.Types.ObjectId, ref: "Destination", required: true },
  startsAt: { type: Date, required: true }, endsAt: { type: Date, required: true }, guests: { type: Number, required: true },
  note: { type: String, maxlength: 1000 },
  status: { type: String, enum: ["pending_payment", "confirmed", "cancelled", "completed"], default: "pending_payment" },
  priceSnapshot: { amount: { type: Number, required: true }, currency: { type: String, required: true } }
}, { timestamps: true });
bookingSchema.index({ guideId: 1, startsAt: 1, endsAt: 1, status: 1 });
bookingSchema.index({ travelerId: 1, createdAt: -1 });
export const BookingModel = model("Booking", bookingSchema);
