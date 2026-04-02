import { HttpError } from "../errors/http-error.js";
import { enqueueRefillJob } from "../queues/refill-queue.js";
import { adRepository } from "../repositories/ad.repository.js";
import { generationJobRepository } from "../repositories/generation-job.repository.js";
import type { ManualRefillBody } from "../schemas/ads.schema.js";
import { isSheddingLoad } from "./load-shedding.service.js";

export const refillApiService = {
    async manualRefill(adId: string, body: ManualRefillBody) {
        const ad = await adRepository.findById(adId);
        if (!ad) {
            throw new HttpError(404, "Anúncio não encontrado.", {
                code: "AD_NOT_FOUND",
            });
        }

        if (await isSheddingLoad()) {
            throw new HttpError(
                503,
                "Geração temporariamente indisponível (load shedding). Tente mais tarde.",
                { code: "LOAD_SHEDDING" },
            );
        }

        const job = await generationJobRepository.createPending({
            adId,
            requestedCount: body.requested_count,
            reason: "manual_refill",
        });

        await enqueueRefillJob({
            jobId: job.jobId,
            adId,
            requestedCount: body.requested_count,
            reason: "manual_refill",
        });

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
