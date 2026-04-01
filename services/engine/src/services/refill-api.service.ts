import { env } from "../config/env.js";
import { HttpError } from "../errors/http-error.js";
import { redis } from "../lib/redis.js";
import { adRepository } from "../repositories/ad.repository.js";
import { generationJobRepository } from "../repositories/generation-job.repository.js";
import type { ManualRefillBody } from "../schemas/ads.schema.js";

export const refillApiService = {
    async manualRefill(adId: string, body: ManualRefillBody) {
        const ad = await adRepository.findById(adId);
        if (!ad) {
            throw new HttpError(404, "Anúncio não encontrado.", {
                code: "AD_NOT_FOUND",
            });
        }

        const job = await generationJobRepository.createPending({
            adId,
            requestedCount: body.requested_count,
            reason: "manual_refill",
        });

        await redis.xadd(
            env.REFILL_STREAM_KEY,
            "*",
            "job_id",
            job.jobId,
            "ad_id",
            adId,
            "requested_count",
            body.requested_count,
            "reason",
            "manual_refill",
        );

        return {
            job: {
                job_id: job.jobId,
                ad_id: job.adId,
                requested_count: job.requestedCount,
                reason: job.reason ?? "manual_refill",
                status: job.status,
            },
        };
    },
};
