import type { GenerationJob } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

const REFILL_REASONS = ["initial_fill", "refill", "manual_refill"] as const;
const ACTIVE_STATUSES = ["pending", "processing"] as const;

export const generationJobRepository = {
    async createPending(data: {
        adId: string;
        requestedCount: number;
        reason: string;
    }): Promise<GenerationJob> {
        return prisma.generationJob.create({
            data: {
                adId: data.adId,
                requestedCount: data.requestedCount,
                reason: data.reason,
                status: "pending",
            },
        });
    },

    async hasRefillInProgress(adId: string): Promise<boolean> {
        const count = await prisma.generationJob.count({
            where: {
                adId,
                status: { in: [...ACTIVE_STATUSES] },
                reason: { in: [...REFILL_REASONS] },
            },
        });
        return count > 0;
    },
};
