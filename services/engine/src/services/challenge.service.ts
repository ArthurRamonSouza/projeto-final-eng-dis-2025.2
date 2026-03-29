import type { Prisma } from "../generated/prisma/client.js";
import { HttpError } from "../errors/http-error.js";
import { adRepository } from "../repositories/ad.repository.js";
import { challengeConsumptionRepository } from "../repositories/challenge-consumption.repository.js";
import { redisPoolRepository } from "../repositories/redis-pool.repository.js";
import { staticChallengeRepository } from "../repositories/static-challenge.repository.js";
import { pooledChallengeSchema } from "../schemas/ads.schema.js";
import { evaluateRefill } from "./refill.service.js";

function optionsFromJson(value: Prisma.JsonValue): string[] {
    if (Array.isArray(value) && value.every((x) => typeof x === "string")) {
        return value as string[];
    }
    return [];
}

function safeParsePooled(raw: string) {
    try {
        const data: unknown = JSON.parse(raw);
        return pooledChallengeSchema.safeParse(data);
    } catch {
        return { success: false as const, error: null };
    }
}

export const challengeService = {
    async getChallenge(adId: string) {
        const ad = await adRepository.findById(adId);
        if (!ad) {
            throw new HttpError(404, "Anúncio não encontrado.", {
                code: "AD_NOT_FOUND",
            });
        }

        const raw = await redisPoolRepository.popChallenge(adId);
        if (raw) {
            const parsed = safeParsePooled(raw);
            if (parsed.success) {
                const poolSizeAfter = await redisPoolRepository.size(adId);
                const { refillRequested } = await evaluateRefill(
                    adId,
                    poolSizeAfter,
                );
                return {
                    challenge: {
                        id: parsed.data.id,
                        ad_id: adId,
                        type: parsed.data.type,
                        question: parsed.data.question,
                        options: parsed.data.options,
                        source: "ai" as const,
                    },
                    fallback_used: false,
                    pool_size_after_consume: poolSizeAfter,
                    refill_requested: refillRequested,
                };
            }
        }

        const staticRow =
            await staticChallengeRepository.findActiveRandom(adId);
        if (!staticRow) {
            throw new HttpError(
                404,
                "Nenhum desafio disponível para este anúncio.",
                {
                    code: "NO_CHALLENGE_AVAILABLE",
                },
            );
        }

        await challengeConsumptionRepository.logStaticConsume({
            challengeId: staticRow.id,
            adId,
            source: staticRow.source,
        });

        const poolSizeAfter = await redisPoolRepository.size(adId);
        const { refillRequested } = await evaluateRefill(adId, poolSizeAfter);

        return {
            challenge: {
                id: staticRow.id,
                ad_id: adId,
                type: staticRow.type,
                question: staticRow.question,
                options: optionsFromJson(staticRow.optionsJson),
                source: "static" as const,
            },
            fallback_used: true,
            pool_size_after_consume: poolSizeAfter,
            refill_requested: refillRequested,
        };
    },
};
