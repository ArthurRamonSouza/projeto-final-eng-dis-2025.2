import { Router } from "express";
import { metricsController } from "../controllers/metrics.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";

export const metricsRouter: Router = Router();

metricsRouter.get("/summary", asyncHandler(metricsController.summary));
