import { env } from "../config/env.js";
import { enqueueRefillJob } from "../queues/refill-queue.js";
import { generationJobRepository } from "../repositories/generation-job.repository.js";
import { isSheddingLoad } from "./load-shedding.service.js";

export async function evaluateRefill(
    adId: string,
    poolSizeAfterConsume: number,
): Promise<{ refillRequested: boolean; newJobCreated: boolean }> {
    const refillRequested = poolSizeAfterConsume < env.POOL_MIN;
    if (!refillRequested) {
        return { refillRequested: false, newJobCreated: false };
    }

    if (await isSheddingLoad()) {
        return { refillRequested: true, newJobCreated: false };
    }

    const inProgress = await generationJobRepository.hasRefillInProgress(adId);
    if (inProgress) {
        return { refillRequested: true, newJobCreated: false };
    }

    const gap = Math.max(1, env.POOL_TARGET - poolSizeAfterConsume);
    const job = await generationJobRepository.createPending({
        adId,
        requestedCount: gap,
        reason: "refill",
    });

    await enqueueRefillJob({
        jobId: job.jobId,
        adId,
        requestedCount: gap,
        reason: "refill",
    });

    return { refillRequested: true, newJobCreated: true };
}
