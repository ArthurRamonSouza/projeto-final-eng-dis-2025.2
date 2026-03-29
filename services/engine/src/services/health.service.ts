import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";

type DepStatus = "ok" | "error";

async function checkPostgres(): Promise<DepStatus> {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return "ok";
    } catch {
        return "error";
    }
}

async function checkRedis(): Promise<DepStatus> {
    try {
        const pong = await redis.ping();
        return pong === "PONG" ? "ok" : "error";
    } catch {
        return "error";
    }
}

export const healthService = {
    getLiveness() {
        return {
            service: "engine",
            status: "ok" as const,
        };
    },

    async getDependencies() {
        const [postgres, redisStatus] = await Promise.all([
            checkPostgres(),
            checkRedis(),
        ]);
        return {
            service: "engine" as const,
            status: "ok" as const,
            dependencies: {
                redis: redisStatus,
                postgres,
            },
        };
    },
};
