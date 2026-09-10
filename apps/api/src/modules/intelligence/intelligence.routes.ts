import { Router } from "express";
import { env } from "../../config/env.js";
import { DevelopmentIntelligenceProvider, UnavailableIntelligenceProvider } from "./intelligence.provider.js";
import { DestinationModel } from "../destinations/destination.model.js";
import { AppError } from "../../shared/errors.js";

const router = Router();
const provider = env.USE_DEVELOPMENT_PROVIDERS ? new DevelopmentIntelligenceProvider() : new UnavailableIntelligenceProvider();
async function exists(id: string) { if (!(await DestinationModel.exists({ _id: id, status: "published" }))) throw new AppError(404, "DESTINATION_NOT_FOUND", "Destination not found."); }
router.get("/:id/safety", async (req, res, next) => { try { await exists(req.params.id); res.json({ data: await provider.getSafety(req.params.id) }); } catch (e) { next(e); } });
router.get("/:id/traffic", async (req, res, next) => { try { await exists(req.params.id); res.json({ data: await provider.getTraffic(req.params.id) }); } catch (e) { next(e); } });
export default router;
