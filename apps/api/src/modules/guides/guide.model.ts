import { Schema, model, type InferSchemaType } from "mongoose";

const guideSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  bio: { type: String, maxlength: 2000, default: "" },
  residenceState: { type: String, trim: true, maxlength: 80, default: "" },
  serviceStates: { type: [String], default: [] },
  languages: { type: [String], default: [] },
  specialties: { type: [String], default: [] },
  destinationIds: { type: [Schema.Types.ObjectId], ref: "Destination", default: [] },
  pricePerDay: { type: Number, min: 0 },
  currency: { type: String, default: "INR" },
  packages: { type: [{ title: { type: String, required: true, maxlength: 120 }, durationHours: { type: Number, required: true, min: 1, max: 240 }, price: { type: Number, required: true, min: 0 }, inclusions: { type: [String], default: [] }, exclusions: { type: [String], default: [] }, active: { type: Boolean, default: true } }], default: [] },
  verificationStatus: { type: String, enum: ["not_started", "pending", "approved", "rejected"], default: "not_started" },
  visibility: { type: String, enum: ["draft", "published"], default: "draft" },
  rating: { average: { type: Number, default: 0 }, count: { type: Number, default: 0 } }
}, { timestamps: true });
guideSchema.index({ verificationStatus: 1, visibility: 1, destinationIds: 1 });
export type Guide = InferSchemaType<typeof guideSchema>;
export const GuideModel = model("GuideProfile", guideSchema);
