import { Schema, model, type InferSchemaType } from "mongoose";

const destinationSchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  state: { type: String, required: true, trim: true },
  country: { type: String, required: true, default: "India" },
  summary: { type: String, required: true, maxlength: 500 },
  description: { type: String, required: true, maxlength: 5000 },
  heroImageUrl: { type: String },
  coordinates: { type: { type: String, enum: ["Point"], default: "Point" }, coordinates: { type: [Number], required: true } },
  tags: { type: [String], default: [] },
  status: { type: String, enum: ["draft", "published"], default: "draft" }
}, { timestamps: true });
destinationSchema.index({ coordinates: "2dsphere" });
destinationSchema.index({ status: 1, name: 1 });
export type Destination = InferSchemaType<typeof destinationSchema>;
export const DestinationModel = model("Destination", destinationSchema);
