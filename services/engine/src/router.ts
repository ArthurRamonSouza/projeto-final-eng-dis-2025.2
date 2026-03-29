import { Router } from "express";
import { adsRouter } from "./routes/ads.routes.js";
import { healthRouter } from "./routes/health.routes.js";

export const router: Router = Router();

router.use("/health", healthRouter);
router.use("/ads", adsRouter);
