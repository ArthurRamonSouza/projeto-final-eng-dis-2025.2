import { Router } from "express";
import { healthController } from "../controllers/health.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";

export const healthRouter: Router = Router();

healthRouter.get("/", asyncHandler(healthController.liveness));
healthRouter.get("/dependencies", asyncHandler(healthController.dependencies));
healthRouter.get(
    "/redis-pool-circuit",
    asyncHandler(healthController.redisPoolCircuit),
);
healthRouter.post("/toggle-ai", asyncHandler(healthController.toggleAi));
