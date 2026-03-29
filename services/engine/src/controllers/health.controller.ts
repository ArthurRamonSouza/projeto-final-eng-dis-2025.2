import type { RequestHandler } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { healthService } from "../services/health.service.js";

export interface HealthController {
    liveness: RequestHandler<ParamsDictionary>;
    dependencies: RequestHandler<ParamsDictionary>;
}

export const healthController: HealthController = {
    liveness: async (_req, res) => {
        res.json(healthService.getLiveness());
    },

    dependencies: async (_req, res) => {
        const result = await healthService.getDependencies();
        res.json(result);
    },
};
