import { Schema, model, type InferSchemaType } from "mongoose";

const sessionSchema = new Schema({ id: { type: String, required: true }, tokenHash: { type: String, required: true }, expiresAt: { type: Date, required: true } }, { _id: false });
const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  emailVerifiedAt: { type: Date, default: null },
  emailVerification: { codeHash: { type: String, select: false }, expiresAt: { type: Date, select: false }, attempts: { type: Number, default: 0, select: false } },
  roles: { type: [String], enum: ["traveler", "guide", "admin"], default: ["traveler"] },
  status: { type: String, enum: ["active", "suspended"], default: "active" },
  sessions: { type: [sessionSchema], default: [] }
}, { timestamps: true });
export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model("User", userSchema);
