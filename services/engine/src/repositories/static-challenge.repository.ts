import type { StaticChallenge } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

export const staticChallengeRepository = {
    async findActiveRandom(adId: string): Promise<StaticChallenge | null> {
        const rows = await prisma.staticChallenge.findMany({
            where: { adId, status: "active" },
            take: 50,
            orderBy: { createdAt: "desc" },
        });
        if (rows.length === 0) {
            return null;
        }
        const idx = Math.floor(Math.random() * rows.length);
        return rows[idx] ?? null;
    },
};
