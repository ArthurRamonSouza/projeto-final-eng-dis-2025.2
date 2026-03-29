import { prisma } from "../lib/prisma.js";

export const challengeConsumptionRepository = {
    async logStaticConsume(params: {
        challengeId: string;
        adId: string;
        source: string;
    }): Promise<void> {
        await prisma.challengeConsumptionLog.create({
            data: {
                challengeId: params.challengeId,
                adId: params.adId,
                source: params.source,
                consumedAt: new Date(),
            },
        });
    },
};
