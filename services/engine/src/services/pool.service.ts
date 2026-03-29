import { env } from "../config/env.js";
import { HttpError } from "../errors/http-error.js";
import { adRepository } from "../repositories/ad.repository.js";
import { generationJobRepository } from "../repositories/generation-job.repository.js";
import { redisPoolRepository } from "../repositories/redis-pool.repository.js";

export const poolService = {
    async getStatus(adId: string) {
        const ad = await adRepository.findById(adId);
        if (!ad) {
            throw new HttpError(404, "Anúncio não encontrado.", {
                code: "AD_NOT_FOUND",
            });
        }

        const poolSize = await redisPoolRepository.size(adId);
        const refillNeeded = poolSize < env.POOL_MIN;
        const refillInProgress =
            await generationJobRepository.hasRefillInProgress(adId);

        return {
            ad_id: adId,
            pool_size: poolSize,
            pool_min: env.POOL_MIN,
            pool_target: env.POOL_TARGET,
            refill_needed: refillNeeded,
            refill_in_progress: refillInProgress,
        };
    },
};
