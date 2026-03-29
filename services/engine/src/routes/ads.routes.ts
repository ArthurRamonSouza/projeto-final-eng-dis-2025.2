import { Router } from "express";
import { adsController } from "../controllers/ads.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import {
    adIdParamsSchema,
    createAdBodySchema,
    manualRefillBodySchema,
} from "../schemas/ads.schema.js";

export const adsRouter: Router = Router();

adsRouter.post(
    "/",
    validateBody(createAdBodySchema),
    asyncHandler(adsController.create),
);
adsRouter.get("/", asyncHandler(adsController.list));
adsRouter.get(
    "/:adId",
    validateParams(adIdParamsSchema),
    asyncHandler(adsController.getById),
);
adsRouter.get(
    "/:adId/challenge",
    validateParams(adIdParamsSchema),
    asyncHandler(adsController.getChallenge),
);
adsRouter.get(
    "/:adId/pool-status",
    validateParams(adIdParamsSchema),
    asyncHandler(adsController.poolStatus),
);
adsRouter.post(
    "/:adId/refill",
    validateParams(adIdParamsSchema),
    validateBody(manualRefillBodySchema),
    asyncHandler(adsController.manualRefill),
);
