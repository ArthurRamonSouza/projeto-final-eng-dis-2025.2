import { env } from "../config/env.js";
import { generationJobRepository } from "../repositories/generation-job.repository.js";

/**
 * Quando o pool está abaixo do mínimo, publica um job de refill se ainda não houver um em andamento.
 * Retorna se foi pedido refill (pool abaixo do mínimo) e se um novo job foi criado.
 */
export async function evaluateRefill(
    adId: string,
    poolSizeAfterConsume: number,
): Promise<{ refillRequested: boolean; newJobCreated: boolean }> {
    const refillRequested = poolSizeAfterConsume < env.POOL_MIN;
    if (!refillRequested) {
        return { refillRequested: false, newJobCreated: false };
    }

    const inProgress = await generationJobRepository.hasRefillInProgress(adId);
    if (inProgress) {
        return { refillRequested: true, newJobCreated: false };
    }

    const gap = Math.max(1, env.POOL_TARGET - poolSizeAfterConsume);
    await generationJobRepository.createPending({
        adId,
        requestedCount: gap,
        reason: "refill",
    });

    return { refillRequested: true, newJobCreated: true };
}
