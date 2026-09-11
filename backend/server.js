import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import nodemailer from "nodemailer";

const app = express();
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || "development-only-secret-change-this-before-deploying";
const emailUser = process.env.EMAIL_USER || "pandeysp8080@gmail.com";
const emailFrom = process.env.EMAIL_FROM || `YatraVerse <${emailUser}>`;
const emailTransport = process.env.EMAIL_APP_PASSWORD ? nodemailer.createTransport({ service: "gmail", auth: { user: emailUser, pass: process.env.EMAIL_APP_PASSWORD } }) : null;
const tomtomTrafficKey = process.env.TOMTOM_TRAFFIC_API_KEY || "";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || true }));
app.use(express.json({ limit: "1mb" }));

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  roles: { type: [String], default: ["traveler"] },
  // Undefined means a pre-OTP legacy account and remains allowed to sign in.
  emailVerified: { type: Boolean, default: undefined },
  verificationOtpHash: { type: String, select: false },
  verificationOtpExpiresAt: { type: Date, select: false },
  verificationOtpAttempts: { type: Number, default: 0, select: false },
  verificationOtpLastSentAt: { type: Date, select: false },
  verificationOtpSendCount: { type: Number, default: 0, select: false },
  verificationOtpWindowStartedAt: { type: Date, select: false }
}, { timestamps: true });

const destinationSchema = new mongoose.Schema({
  name: String, slug: { type: String, unique: true }, state: String, country: { type: String, default: "India" },
  summary: String, description: String, coordinates: { type: { type: String, default: "Point" }, coordinates: [Number] },
  tags: [String], status: { type: String, default: "published" }
}, { timestamps: true });

const experienceSchema = new mongoose.Schema({
  title: { type: String, required: true }, durationHours: { type: Number, min: 1, max: 240, required: true },
  price: { type: Number, min: 0, required: true }, inclusions: [String], exclusions: [String],
  offeredItems: [String], active: { type: Boolean, default: true }
}, { _id: true });

const guideSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, required: true },
  bio: { type: String, default: "" }, residenceState: { type: String, default: "" }, serviceStates: [String],
  languages: [String], specialties: [String], destinationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Destination" }],
  pricePerDay: Number, currency: { type: String, default: "INR" }, packages: [experienceSchema],
  // Flexible list controlled by each local guide: transport, meals, permits, accessibility support, etc.
  tripOfferings: [{ name: String, description: String, included: Boolean, extraCost: Number }],
  availabilityNote: { type: String, default: "" },
  // These are shared with a traveler only on their confirmed trip, never in the public guide directory.
  contactPhone: { type: String, trim: true, maxlength: 32, default: "" },
  contactEmail: { type: String, trim: true, lowercase: true, maxlength: 254, default: "" },
  // Profile media is stored as URLs so hosts can use an image CDN, Drive share link, or their own hosted images.
  profilePhotoUrl: { type: String, trim: true, maxlength: 2000, default: "" },
  dateOfBirth: { type: Date, default: null },
  maritalStatus: { type: String, enum: ["", "single", "married", "prefer_not_to_say"], default: "" },
  gender: { type: String, trim: true, maxlength: 40, default: "" },
  address: { type: String, trim: true, maxlength: 500, default: "" },
  city: { type: String, trim: true, maxlength: 100, default: "" },
  postalCode: { type: String, trim: true, maxlength: 20, default: "" },
  yearsOfExperience: { type: Number, min: 0, max: 80, default: 0 },
  propertyName: { type: String, trim: true, maxlength: 160, default: "" },
  propertyType: { type: String, enum: ["", "homestay", "hotel", "guesthouse", "other"], default: "" },
  propertyDescription: { type: String, trim: true, maxlength: 2000, default: "" },
  propertyPhotoUrls: { type: [String], default: [] },
  verificationStatus: { type: String, default: "not_started" },
  visibility: { type: String, default: "draft" }, rating: { average: { type: Number, default: 0 }, count: { type: Number, default: 0 } }
}, { timestamps: true });

const bookingSchema = new mongoose.Schema({
  travelerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  guideId: { type: mongoose.Schema.Types.ObjectId, ref: "GuideProfile", required: true },
  destinationId: { type: mongoose.Schema.Types.ObjectId, ref: "Destination", required: true },
  startsAt: Date, endsAt: Date, guests: Number, note: String, status: { type: String, default: "pending_payment" },
  priceSnapshot: { amount: Number, currency: String }
}, { timestamps: true });

const reviewSchema = new mongoose.Schema({
  guideId: { type: mongoose.Schema.Types.ObjectId, ref: "GuideProfile", required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
  travelerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, maxlength: 1200, default: "" }
}, { timestamps: true });

const messageSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  body: { type: String, trim: true, required: true, maxlength: 2000 }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
const Destination = mongoose.model("Destination", destinationSchema);
const Guide = mongoose.model("GuideProfile", guideSchema);
const Booking = mongoose.model("Booking", bookingSchema);
const Review = mongoose.model("Review", reviewSchema);
const Message = mongoose.model("BookingMessage", messageSchema);
const messageStreams = new Map();

const starterDestinations = [
  { name: "Jaipur", slug: "jaipur", state: "Rajasthan", summary: "Palaces, bazaars, craft, and the warm geometry of the Pink City.", description: "Discover Jaipur through its forts, food lanes, artisan workshops, and old-city stories.", coordinates: [75.7873, 26.9124], tags: ["heritage", "food", "culture"] },
  { name: "Varanasi", slug: "varanasi", state: "Uttar Pradesh", summary: "Ancient river rituals, living lanes, and a city best understood slowly.", description: "Experience the ghats, music, food, and local rhythms of one of India’s oldest living cities.", coordinates: [83.0101, 25.3176], tags: ["spiritual", "heritage", "culture"] },
  { name: "Manali", slug: "manali", state: "Himachal Pradesh", summary: "Mountain trails, pine forests, and Himalayan adventure.", description: "Plan mountain walks, local villages, and seasonal adventures with clear weather context.", coordinates: [77.1892, 32.2432], tags: ["mountains", "adventure", "nature"] },
  { name: "Kochi", slug: "kochi", state: "Kerala", summary: "Harbour history, coastal flavours, and an artistic old quarter.", description: "Explore Fort Kochi, local cuisine, waterways, and the layered cultures of the Malabar coast.", coordinates: [76.2673, 9.9312], tags: ["coast", "food", "art"] },
  { name: "Rishikesh", slug: "rishikesh", state: "Uttarakhand", summary: "River adventures, forested foothills, and a calmer pace.", description: "Explore yoga, rafting, riverside walks, and the gateways to the Garhwal Himalaya.", coordinates: [78.2676, 30.0869], tags: ["adventure", "wellness", "nature"] },
  { name: "Goa", slug: "goa", state: "Goa", summary: "Coastal villages, heritage quarters, beaches, and local food.", description: "See Goa beyond the beach through its markets, homes, history, and shoreline.", coordinates: [74.124, 15.2993], tags: ["beach", "food", "heritage"] }
];

async function ensureStarterDestinations() {
  if (await Destination.exists({ status: "published" })) return;

  await Destination.bulkWrite(
    starterDestinations.map(destination => ({
      updateOne: {
        filter: { slug: destination.slug },
        update: {
          $set: {
            status: "published"
          },
          $setOnInsert: {
            ...destination,
            country: "India",
            coordinates: {
              type: "Point",
              coordinates: destination.coordinates
            }
          }
        },
        upsert: true
      }
    }))
  );

  console.info("Added starter destinations for local development.");
}

function sendError(res, status, message) { return res.status(status).json({ error: { message } }); }
function serializeUser(user) { return { id: String(user._id), name: user.name, email: user.email, roles: user.roles, emailVerified: user.emailVerified !== false }; }
function createAccessToken(user) { return jwt.sign({ id: String(user._id), roles: user.roles }, jwtSecret, { expiresIn: "7d" }); }
function emailError() { return "We could not send your verification email. Please try again shortly."; }
async function sendVerificationEmail(to, otp) {
  if (!emailTransport) throw new Error("Email service is not configured");
  await emailTransport.sendMail({ from: emailFrom, to, subject: "Verify your YatraVerse account", text: `Welcome to YatraVerse. Your verification code is ${otp}. It expires in 10 minutes. Do not share this code with anyone.` });
}
async function issueVerificationOtp(user, { allowCooldown = false } = {}) {
  const now = new Date();
  if (!allowCooldown && user.verificationOtpLastSentAt && now - user.verificationOtpLastSentAt < 60_000) throw Object.assign(new Error("Please wait 60 seconds before requesting another code."), { status: 429 });
  const withinWindow = Boolean(user.verificationOtpWindowStartedAt && now - user.verificationOtpWindowStartedAt < 60 * 60_000);
  const windowStarted = withinWindow ? user.verificationOtpWindowStartedAt : now;
  const sentInWindow = withinWindow ? user.verificationOtpSendCount || 0 : 0;
  if (sentInWindow >= 5) throw Object.assign(new Error("Too many verification emails were requested. Please try again in an hour."), { status: 429 });
  const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await sendVerificationEmail(user.email, otp);
  user.verificationOtpHash = await argon2.hash(otp);
  user.verificationOtpExpiresAt = new Date(now.getTime() + 10 * 60_000);
  user.verificationOtpAttempts = 0;
  user.verificationOtpLastSentAt = now;
  user.verificationOtpWindowStartedAt = windowStarted;
  user.verificationOtpSendCount = sentInWindow + 1;
  await user.save();
}
function auth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return sendError(res, 401, "Please sign in to continue.");
  try { req.user = jwt.verify(token, jwtSecret); next(); }
  catch { return sendError(res, 401, "Your session has expired. Please sign in again."); }
}
function guideOnly(req, res, next) { return req.user.roles?.includes("guide") ? next() : sendError(res, 403, "This area is for local guides."); }
function adminOnly(req, res, next) { return req.user.roles?.includes("admin") ? next() : sendError(res, 403, "This area is for administrators."); }
function cleanList(value) { return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : []; }
function isId(value) { return mongoose.isObjectIdOrHexString(value); }
function cleanImageUrls(value, max = 8) { return cleanList(value).filter((url) => /^https?:\/\//i.test(url)).slice(0, max); }
function publicGuide(guide) {
  const { contactPhone, contactEmail, dateOfBirth, maritalStatus, gender, address, city, postalCode, ...profile } = guide;
  return profile;
}
async function bookingParticipant(bookingId, userId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) return null;
  if (String(booking.travelerId) === String(userId)) return booking;
  const guide = await Guide.findOne({ _id: booking.guideId, userId });
  return guide ? booking : null;
}
function broadcastMessage(bookingId, message) {
  for (const response of messageStreams.get(String(bookingId)) || []) response.write(`data: ${JSON.stringify(message)}\n\n`);
}
async function getLiveRoadContext(latitude, longitude) {
  if (!tomtomTrafficKey) return null;
  const point = `${latitude},${longitude}`, radius = 0.12;
  const flowUrl = new URL("https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json");
  flowUrl.search = new URLSearchParams({ key: tomtomTrafficKey, point, unit: "KMPH" }).toString();
  const incidentUrl = new URL("https://api.tomtom.com/traffic/services/5/incidentDetails");
  incidentUrl.search = new URLSearchParams({ key: tomtomTrafficKey, bbox: `${longitude - radius},${latitude - radius},${longitude + radius},${latitude + radius}`, language: "en-GB", timeValidityFilter: "present" }).toString();
  const [flowResponse, incidentResponse] = await Promise.all([fetch(flowUrl, { signal: AbortSignal.timeout(5000) }), fetch(incidentUrl, { signal: AbortSignal.timeout(5000) })]);
  if (!flowResponse.ok || !incidentResponse.ok) throw new Error("Live road provider did not respond");
  const flowPayload = await flowResponse.json(), incidentsPayload = await incidentResponse.json();
  const flow = flowPayload.flowSegmentData || {};
  const currentSpeed = Number(flow.currentSpeed), freeFlowSpeed = Number(flow.freeFlowSpeed);
  const speedRatio = freeFlowSpeed > 0 ? Math.round((currentSpeed / freeFlowSpeed) * 100) : null;
  const closure = Boolean(flow.roadClosure);
  const trafficSummary = closure ? "A road closure is reported near this destination." : Number.isFinite(currentSpeed) ? `Traffic is moving at about ${currentSpeed} km/h${speedRatio != null ? ` (${speedRatio}% of normal flow)` : ""}.` : "Live traffic is available near this destination.";
  const incidents = Array.isArray(incidentsPayload.incidents) ? incidentsPayload.incidents : [];
  const diversions = incidents.slice(0, 3).map(item => item.properties?.events?.[0]?.description || item.properties?.description || item.properties?.iconCategory || "Traffic incident reported nearby");
  return {
    traffic: { status: "available", source: "TomTom live traffic", summary: trafficSummary, currentSpeed: Number.isFinite(currentSpeed) ? currentSpeed : null, freeFlowSpeed: Number.isFinite(freeFlowSpeed) ? freeFlowSpeed : null },
    route: { status: "available", source: "TomTom live incidents", summary: diversions.length ? `${diversions.length} live incident${diversions.length === 1 ? "" : "s"} may affect routes near this destination.` : "No live incidents are reported near this destination.", diversions }
  };
}
app.get("/api/traffic-tiles/:z/:x/:y.png", async (req, res) => {
  const { z, x, y } = req.params;
  if (!tomtomTrafficKey) return res.status(503).send("Live traffic is not configured.");
  if (![z, x, y].every(value => /^\d{1,9}$/.test(value)) || Number(z) > 22) return res.status(400).send("Invalid map tile.");
  try {
    const endpoint = new URL(`https://api.tomtom.com/traffic/map/4/tile/flow/relative0/${z}/${x}/${y}.png`);
    endpoint.searchParams.set("key", tomtomTrafficKey);
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) return res.status(response.status).send("Traffic tile unavailable.");
    res.set("Content-Type", response.headers.get("content-type") || "image/png");
    res.set("Cache-Control", "public, max-age=30");
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch { res.status(502).send("Traffic tile unavailable."); }
});

app.get("/api/health", (_req, res) => res.json({ data: { status: "ok" } }));

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || "") || String(password || "").length < 8) return sendError(res, 400, "Enter a name, valid email, and password of at least 8 characters.");
  if (await User.exists({ email: email.toLowerCase() })) return sendError(res, 409, "An account with this email already exists.");
  const user = await User.create({ name: name.trim(), email: email.toLowerCase(), passwordHash: await argon2.hash(password), roles: role === "guide" ? ["traveler", "guide"] : ["traveler"], emailVerified: false });
  try {
  await issueVerificationOtp(user, { allowCooldown: true });
} catch (error) {
  console.error("Verification email failed:", error);
  await User.findByIdAndDelete(user._id);
  return sendError(res, 503, emailError());
}
  res.status(201).json({ data: { email: user.email, role: role === "guide" ? "guide" : "traveler", verificationRequired: true } });
});

app.post("/api/auth/verify-email", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase(), otp = String(req.body.otp || "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email) || !/^\d{6}$/.test(otp)) return sendError(res, 400, "Enter the six-digit verification code.");
  const user = await User.findOne({ email }).select("+verificationOtpHash +verificationOtpExpiresAt +verificationOtpAttempts");
  if (!user) return sendError(res, 404, "No registration is waiting for verification at this email.");
  if (user.emailVerified !== false) return sendError(res, 409, "This email is already verified. Please sign in.");
  if (!user.verificationOtpHash || !user.verificationOtpExpiresAt || user.verificationOtpExpiresAt <= new Date()) return sendError(res, 410, "This verification code has expired. Request a new code to continue.");
  if ((user.verificationOtpAttempts || 0) >= 5) return sendError(res, 429, "Too many incorrect codes. Request a new code to continue.");
  if (!(await argon2.verify(user.verificationOtpHash, otp))) { user.verificationOtpAttempts = (user.verificationOtpAttempts || 0) + 1; await user.save(); return sendError(res, 400, "That verification code is incorrect."); }
  user.emailVerified = true; user.verificationOtpHash = undefined; user.verificationOtpExpiresAt = undefined; user.verificationOtpAttempts = 0; await user.save();
  res.json({ data: { user: serializeUser(user), accessToken: createAccessToken(user) } });
});

app.post("/api/auth/resend-verification", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return sendError(res, 400, "Enter a valid email address.");
  const user = await User.findOne({ email }).select("+verificationOtpLastSentAt +verificationOtpSendCount +verificationOtpWindowStartedAt");
  // Do not expose whether unrelated email addresses are registered.
  if (!user || user.emailVerified !== false) return res.json({ data: { sent: true } });
  try { await issueVerificationOtp(user); res.json({ data: { sent: true } }); }
  catch (error) { sendError(res, error.status || 503, error.status ? error.message : emailError()); }
});

app.post("/api/auth/login", async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email || "").toLowerCase() });
  if (!user || !(await argon2.verify(user.passwordHash, String(req.body.password || "")))) return sendError(res, 401, "Email or password is incorrect.");
  if (user.emailVerified === false) return sendError(res, 403, "Please verify your email before continuing. You can request a new code from the verification screen.");
  // The site owner is promoted only from the server-side environment setting; admin cannot be selected at registration.
  const adminEmail = (process.env.ADMIN_EMAIL || "pandeysp8080@gmail.com").toLowerCase();
  if (user.email === adminEmail && !user.roles.includes("admin")) { user.roles.push("admin"); await user.save(); }
  const accessToken = createAccessToken(user);
  res.json({ data: { user: serializeUser(user), accessToken } });
});
app.get("/api/auth/me", auth, async (req, res) => { const user = await User.findById(req.user.id); user ? res.json({ data: { user: serializeUser(user) } }) : sendError(res, 401, "Account not found."); });

app.get("/api/destinations", async (req, res) => {
  const q = String(req.query.q || "").trim(); const filter = { status: "published" };
  if (q) filter.$or = ["name", "state", "tags"].map((field) => ({ [field]: new RegExp(q, "i") }));
  res.json({ data: await Destination.find(filter).sort({ name: 1 }).lean() });
});
app.get("/api/destinations/:slug", async (req, res) => { const item = await Destination.findOne({ slug: req.params.slug, status: "published" }).lean(); item ? res.json({ data: item }) : sendError(res, 404, "Destination not found."); });

app.get("/api/guides", async (req, res) => {
  const filter = { verificationStatus: "approved", visibility: "published" };
  if (isId(req.query.destination)) filter.destinationIds = req.query.destination;
  const guides = await Guide.find(filter).populate("userId", "name").populate("destinationIds", "name slug state").lean();
  res.json({ data: guides.map(publicGuide) });
});
app.get("/api/guides/me/profile", auth, guideOnly, async (req, res) => res.json({ data: await Guide.findOne({ userId: req.user.id }).populate("destinationIds", "name state").lean() }));
app.put("/api/guides/me/profile", auth, guideOnly, async (req, res) => {
  const body = req.body || {};
  const packages = Array.isArray(body.packages) ? body.packages.map((item) => ({ title: String(item.title || "").trim(), durationHours: Number(item.durationHours), price: Number(item.price), inclusions: cleanList(item.inclusions), exclusions: cleanList(item.exclusions), offeredItems: cleanList(item.offeredItems), active: item.active !== false })).filter((item) => item.title && item.durationHours > 0 && item.price >= 0) : [];
  const tripOfferings = Array.isArray(body.tripOfferings) ? body.tripOfferings.map((item) => ({ name: String(item.name || "").trim(), description: String(item.description || "").trim(), included: Boolean(item.included), extraCost: Number(item.extraCost || 0) })).filter((item) => item.name) : [];
  const contactEmail = String(body.contactEmail || "").trim().toLowerCase();
  if (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail)) return sendError(res, 400, "Enter a valid guide contact email.");
  const dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
  if (dateOfBirth && Number.isNaN(dateOfBirth.getTime())) return sendError(res, 400, "Enter a valid date of birth.");
  const update = { bio: String(body.bio || "").trim(), residenceState: String(body.residenceState || "").trim(), serviceStates: cleanList(body.serviceStates), languages: cleanList(body.languages), specialties: cleanList(body.specialties), destinationIds: cleanList(body.destinationIds).filter(isId), pricePerDay: body.pricePerDay === "" || body.pricePerDay == null ? undefined : Number(body.pricePerDay), packages, tripOfferings, availabilityNote: String(body.availabilityNote || "").trim(), contactPhone: String(body.contactPhone || "").trim(), contactEmail, profilePhotoUrl: cleanImageUrls([body.profilePhotoUrl], 1)[0] || "", dateOfBirth, maritalStatus: ["single", "married", "prefer_not_to_say"].includes(body.maritalStatus) ? body.maritalStatus : "", gender: String(body.gender || "").trim(), address: String(body.address || "").trim(), city: String(body.city || "").trim(), postalCode: String(body.postalCode || "").trim(), yearsOfExperience: Math.max(0, Math.min(80, Number(body.yearsOfExperience || 0))), propertyName: String(body.propertyName || "").trim(), propertyType: ["homestay", "hotel", "guesthouse", "other"].includes(body.propertyType) ? body.propertyType : "", propertyDescription: String(body.propertyDescription || "").trim(), propertyPhotoUrls: cleanImageUrls(body.propertyPhotoUrls) };
  const profile = await Guide.findOneAndUpdate({ userId: req.user.id }, { $set: update, $setOnInsert: { userId: req.user.id } }, { new: true, upsert: true, runValidators: true }).populate("destinationIds", "name state");
  res.json({ data: profile });
});
app.put("/api/guides/me/contact", auth, guideOnly, async (req, res) => {
  const contactEmail = String(req.body.contactEmail || "").trim().toLowerCase();
  const contactPhone = String(req.body.contactPhone || "").trim();
  if (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail)) return sendError(res, 400, "Enter a valid guide contact email.");
  const profile = await Guide.findOneAndUpdate({ userId: req.user.id }, { $set: { contactPhone, contactEmail }, $setOnInsert: { userId: req.user.id } }, { new: true, upsert: true });
  res.json({ data: { contactPhone: profile.contactPhone, contactEmail: profile.contactEmail } });
});
app.post("/api/guides/me/submit", auth, guideOnly, async (req, res) => { const guide = await Guide.findOneAndUpdate({ userId: req.user.id, verificationStatus: { $in: ["not_started", "rejected"] } }, { verificationStatus: "pending", visibility: "draft" }, { new: true }); guide ? res.json({ data: guide }) : sendError(res, 409, "This profile cannot be submitted for review right now."); });
app.get("/api/guides/me/requests", auth, guideOnly, async (req, res) => {
  const guide = await Guide.findOne({ userId: req.user.id });
  if (!guide) return res.json({ data: [] });
  const requests = await Booking.find({ guideId: guide._id }).populate("travelerId", "name email").populate("destinationId", "name state").sort({ createdAt: -1 }).lean();
  res.json({ data: requests });
});
app.patch("/api/guides/me/requests/:bookingId", auth, guideOnly, async (req, res) => {
  if (!isId(req.params.bookingId) || !["approved", "declined"].includes(req.body.decision)) return sendError(res, 400, "Choose approved or declined.");
  const guide = await Guide.findOne({ userId: req.user.id });
  const booking = await Booking.findOne({ _id: req.params.bookingId, guideId: guide?._id, status: "pending_guide_approval" });
  if (!booking) return sendError(res, 404, "This pending trip request was not found.");
  if (req.body.decision === "approved") {
    const conflict = await Booking.exists({ guideId: guide._id, status: "confirmed", startsAt: { $lt: booking.endsAt }, endsAt: { $gt: booking.startsAt } });
    if (conflict) return sendError(res, 409, "Those dates are no longer available. Decline this request and suggest another date.");
    booking.status = "confirmed";
  } else booking.status = "declined_by_guide";
  await booking.save();
  res.json({ data: booking });
});
app.get("/api/guides/:guideId", async (req, res) => {
  if (!isId(req.params.guideId)) return sendError(res, 400, "Invalid guide.");
  const guide = await Guide.findOne({ _id: req.params.guideId, verificationStatus: "approved", visibility: "published" }).populate("userId", "name").populate("destinationIds", "name slug state").lean();
  guide ? res.json({ data: publicGuide(guide) }) : sendError(res, 404, "Guide not found.");
});

app.get("/api/reviews/guide/:guideId", async (req, res) => {
  if (!isId(req.params.guideId)) return sendError(res, 400, "Invalid guide.");
  const reviews = await Review.find({ guideId: req.params.guideId }).populate("travelerId", "name").sort({ createdAt: -1 }).lean();
  res.json({ data: reviews.map(review => ({ ...review, traveler: review.travelerId?.name || "Traveler", travelerId: undefined })) });
});
app.post("/api/reviews", auth, async (req, res) => {
  const { bookingId, rating, comment } = req.body;
  if (!isId(bookingId) || !Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) return sendError(res, 400, "Choose a rating from 1 to 5 stars.");
  const booking = await Booking.findOne({ _id: bookingId, travelerId: req.user.id, status: "completed" });
  if (!booking) return sendError(res, 403, "A review can be added only after your completed trip.");
  if (await Review.exists({ bookingId })) return sendError(res, 409, "You have already reviewed this trip.");
  const review = await Review.create({ guideId: booking.guideId, bookingId, travelerId: req.user.id, rating: Number(rating), comment: String(comment || "").trim() });
  const aggregate = await Review.aggregate([{ $match: { guideId: booking.guideId } }, { $group: { _id: "$guideId", average: { $avg: "$rating" }, count: { $sum: 1 } } }]);
  await Guide.findByIdAndUpdate(booking.guideId, { $set: { "rating.average": aggregate[0].average, "rating.count": aggregate[0].count } });
  res.status(201).json({ data: review });
});

app.get("/api/bookings/:bookingId/messages", auth, async (req, res) => {
  if (!isId(req.params.bookingId) || !(await bookingParticipant(req.params.bookingId, req.user.id))) return sendError(res, 403, "You do not have access to this conversation.");
  const messages = await Message.find({ bookingId: req.params.bookingId }).populate("senderId", "name").sort({ createdAt: 1 }).lean();
  res.json({ data: messages.map(message => ({ id: message._id, body: message.body, sentAt: message.createdAt, sender: message.senderId?.name || "Traveler", senderId: String(message.senderId?._id || message.senderId), mine: String(message.senderId?._id || message.senderId) === String(req.user.id) })) });
});
app.post("/api/bookings/:bookingId/messages", auth, async (req, res) => {
  if (!isId(req.params.bookingId) || !(await bookingParticipant(req.params.bookingId, req.user.id))) return sendError(res, 403, "You do not have access to this conversation.");
  const body = String(req.body.body || "").trim();
  if (!body || body.length > 2000) return sendError(res, 400, "Write a message of up to 2,000 characters.");
  const message = await Message.create({ bookingId: req.params.bookingId, senderId: req.user.id, body });
  const user = await User.findById(req.user.id).select("name");
  const output = { id: String(message._id), body: message.body, sentAt: message.createdAt, sender: user?.name || "Traveler", senderId: String(req.user.id) };
  broadcastMessage(req.params.bookingId, output);
  res.status(201).json({ data: output });
});
app.get("/api/bookings/:bookingId/messages/stream", async (req, res) => {
  const token = req.query.token;
  let session; try { session = jwt.verify(String(token || ""), jwtSecret); } catch { return sendError(res, 401, "Conversation session expired."); }
  if (!isId(req.params.bookingId) || !(await bookingParticipant(req.params.bookingId, session.id))) return sendError(res, 403, "You do not have access to this conversation.");
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" });
  res.write("retry: 3000\n\n"); const key = String(req.params.bookingId); const listeners = messageStreams.get(key) || new Set(); listeners.add(res); messageStreams.set(key, listeners);
  req.on("close", () => { listeners.delete(res); if (!listeners.size) messageStreams.delete(key); });
});

// Administrator workflow: inspect submitted profiles, publish/reject/remove them, and mark a trip complete for review eligibility.
app.get("/api/admin/guides", auth, adminOnly, async (_req, res) => res.json({ data: await Guide.find().populate("userId", "name email").populate("destinationIds", "name state").sort({ updatedAt: -1 }).lean() }));
app.get("/api/admin/reviews", auth, adminOnly, async (_req, res) => res.json({ data: await Review.find().populate("travelerId", "name").populate({ path: "guideId", populate: { path: "userId", select: "name" } }).sort({ createdAt: -1 }).lean() }));
app.patch("/api/admin/guides/:guideId", auth, adminOnly, async (req, res) => {
  if (!isId(req.params.guideId) || !["approved", "rejected"].includes(req.body.status)) return sendError(res, 400, "Choose approved or rejected.");
  const approved = req.body.status === "approved";
  const guide = await Guide.findByIdAndUpdate(req.params.guideId, { $set: { verificationStatus: req.body.status, visibility: approved ? "published" : "draft" } }, { new: true });
  guide ? res.json({ data: guide }) : sendError(res, 404, "Guide profile not found.");
});
app.delete("/api/admin/guides/:guideId", auth, adminOnly, async (req, res) => {
  if (!isId(req.params.guideId)) return sendError(res, 400, "Invalid guide.");
  const guide = await Guide.findByIdAndDelete(req.params.guideId);
  if (!guide) return sendError(res, 404, "Guide profile not found.");
  await Review.deleteMany({ guideId: guide._id });
  res.status(204).send();
});
app.get("/api/admin/bookings", auth, adminOnly, async (_req, res) => res.json({ data: await Booking.find().populate("travelerId", "name email").populate({ path: "guideId", populate: { path: "userId", select: "name" } }).populate("destinationId", "name").sort({ startsAt: -1 }).lean() }));
app.patch("/api/admin/bookings/:bookingId/complete", auth, adminOnly, async (req, res) => {
  if (!isId(req.params.bookingId)) return sendError(res, 400, "Invalid booking.");
  const booking = await Booking.findByIdAndUpdate(req.params.bookingId, { status: "completed" }, { new: true });
  booking ? res.json({ data: booking }) : sendError(res, 404, "Booking not found.");
});

// Date-aware forecast, with transparent fallbacks. Open-Meteo supports forecast dates in its available range.
app.get("/api/travel-advisory/:destinationId", async (req, res) => {
  const destination = await Destination.findById(req.params.destinationId).lean();
  if (!destination) return sendError(res, 404, "Destination not found.");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || "")) ? String(req.query.date) : new Date().toISOString().slice(0, 10);
  const [longitude, latitude] = destination.coordinates?.coordinates || [];
  const base = { date, destination: destination.name, weather: { status: "unavailable", summary: "A forecast needs coordinates for this destination.", temperature: null, precipitation: null }, hazards: [], traffic: { status: "unavailable", summary: "No live traffic provider is connected yet." }, route: { status: "unavailable", summary: "No verified route-diversion feed is connected yet.", diversions: [] }, generatedAt: new Date().toISOString() };
  if (typeof latitude !== "number" || typeof longitude !== "number") return res.json({ data: base });
  try {
    const endpoint = new URL("https://api.open-meteo.com/v1/forecast");
    endpoint.search = new URLSearchParams({ latitude, longitude, daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max", timezone: "auto", start_date: date, end_date: date }).toString();
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("Forecast provider did not respond");
    const forecast = await response.json(); const daily = forecast.daily;
    const code = daily.weather_code?.[0]; const rainChance = daily.precipitation_probability_max?.[0] || 0; const wind = daily.wind_speed_10m_max?.[0] || 0;
    const labels = { 0: "Clear skies", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Foggy", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Rain showers", 81: "Rain showers", 82: "Heavy showers", 95: "Thunderstorms" };
    const hazards = [];
    if (rainChance >= 60 || [65, 80, 81, 82].includes(code)) hazards.push({ level: "caution", title: "Wet-road risk", detail: "Allow extra time and use routes suitable for rain." });
    if (code === 95 || code === 96 || code === 99) hazards.push({ level: "high", title: "Thunderstorm risk", detail: "Keep outdoor and exposed-route plans flexible." });
    if (wind >= 40) hazards.push({ level: "caution", title: "Strong winds", detail: "Check local transport and outdoor activity conditions." });
    if ([45, 48].includes(code)) hazards.push({ level: "caution", title: "Low visibility", detail: "Drive slowly and avoid early-morning exposed routes where possible." });
    base.weather = { status: "available", source: "Open-Meteo forecast", summary: labels[code] || "Forecast available", temperature: { min: daily.temperature_2m_min?.[0], max: daily.temperature_2m_max?.[0], unit: forecast.daily_units?.temperature_2m_max || "°C" }, precipitation: { chance: rainChance, amount: daily.precipitation_sum?.[0], unit: forecast.daily_units?.precipitation_sum || "mm" } };
    base.hazards = hazards.length ? hazards : [{ level: "low", title: "No weather-derived hazard flagged", detail: "Always check official local advisories before departure." }];
  } catch { base.weather.summary = "Forecast could not be reached. Please try again closer to departure."; }
  try {
    const roadContext = await getLiveRoadContext(latitude, longitude);
    if (roadContext) { base.traffic = roadContext.traffic; base.route = roadContext.route; }
    else { base.traffic.summary = "Live traffic is ready to connect—add TOMTOM_TRAFFIC_API_KEY to enable it."; base.route.summary = "Live route incidents are ready to connect—add TOMTOM_TRAFFIC_API_KEY to enable them."; }
  } catch { base.traffic.summary = "Live traffic could not be reached right now. Please try again shortly."; base.route.summary = "Live route incidents could not be reached right now. Please try again shortly."; }
  res.json({ data: base });
});

app.post("/api/bookings", auth, async (req, res) => {
  const { guideId, destinationId, startsAt, endsAt, guests, note } = req.body;
  if (![guideId, destinationId].every(isId) || !startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt)) return sendError(res, 400, "Enter a valid guide, destination, and travel date range.");
  const guide = await Guide.findOne({ _id: guideId, verificationStatus: "approved", visibility: "published" });
  if (!guide) return sendError(res, 404, "This guide is not currently available.");
  const booking = await Booking.create({ travelerId: req.user.id, guideId, destinationId, startsAt, endsAt, guests: Math.max(1, Number(guests || 1)), note: String(note || ""), status: "pending_guide_approval", priceSnapshot: { amount: guide.pricePerDay || 0, currency: guide.currency } });
  res.status(201).json({ data: booking });
});
app.get("/api/bookings/mine", auth, async (req, res) => res.json({ data: await Booking.find({ travelerId: req.user.id }).populate({ path: "guideId", populate: { path: "userId", select: "name" } }).populate("destinationId", "name state slug").sort({ startsAt: 1 }).lean() }));

// A trip is private to its traveler and guide. Contact details and the live chat are intentionally
// exposed here rather than in public guide search results.
app.get("/api/bookings/:bookingId", auth, async (req, res) => {
  if (!isId(req.params.bookingId) || !(await bookingParticipant(req.params.bookingId, req.user.id))) return sendError(res, 403, "You do not have access to this trip.");
  const booking = await Booking.findById(req.params.bookingId)
    .populate("travelerId", "name email")
    .populate({ path: "guideId", populate: { path: "userId", select: "name" } })
    .populate("destinationId", "name state slug")
    .lean();
  const isConfirmed = booking.status === "confirmed" || booking.status === "completed";
  const guide = booking.guideId;
  res.json({ data: { ...booking, guideContact: isConfirmed ? { phone: guide?.contactPhone || "", email: guide?.contactEmail || "" } : null } });
});

app.use(express.static(path.join(__dirname, "../frontend")));
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "../frontend/index.html")));
app.use((error, _req, res, _next) => { console.error(error); sendError(res, 500, "Something went wrong. Please try again."); });

mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/yatra-verse").then(async () => { await ensureStarterDestinations(); app.listen(port, () => console.log(`Yatra Verse is running at http://localhost:${port}`)); }).catch((error) => { console.error("Could not connect to MongoDB:", error.message); process.exit(1); });
