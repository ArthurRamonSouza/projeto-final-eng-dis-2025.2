import type { RequestHandler } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { redis } from "../lib/redis.js";
import { healthService } from "../services/health.service.js";

export interface HealthController {
    liveness: RequestHandler<ParamsDictionary>;
    dependencies: RequestHandler<ParamsDictionary>;
    redisPoolCircuit: RequestHandler<ParamsDictionary>;
    toggleAi: RequestHandler;
}

export const healthController: HealthController = {
    liveness: async (_req, res) => {
        res.json(healthService.getLiveness());
    },

    dependencies: async (_req, res) => {
        const result = await healthService.getDependencies();
        res.json(result);
    },

    redisPoolCircuit: async (_req, res) => {
        res.json(healthService.getRedisPoolCircuit());
    },

    toggleAi: async (req, res) => {
        const { enabled } = req.body;
        // Salva "true" ou "false" como string no Redis
        await redis.set("feature_flag:ai_enabled", enabled ? "true" : "false");
        res.json({
            message: `API do Gemini foi ${enabled ? "LIGADA" : "DESLIGADA"} com sucesso!`,
            ai_enabled: enabled,
        });
    },
};
