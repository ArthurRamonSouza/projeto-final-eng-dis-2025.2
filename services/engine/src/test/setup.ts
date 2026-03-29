import { afterAll, beforeAll, beforeEach, vi } from "vitest";

vi.mock("../lib/prisma.js", () => ({
    prisma: {
        $queryRaw: vi.fn(),
        $transaction: vi.fn(),
        ad: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
            create: vi.fn(),
        },
        adContent: {
            create: vi.fn(),
        },
        generationJob: {
            create: vi.fn(),
            count: vi.fn(),
        },
        staticChallenge: {
            findMany: vi.fn(),
        },
        challengeConsumptionLog: {
            create: vi.fn(),
        },
    },
}));

vi.mock("../lib/redis.js", () => ({
    redis: {
        rpop: vi.fn(),
        llen: vi.fn(),
        ping: vi.fn(),
        eval: vi.fn().mockResolvedValue([1, 59]),
    },
    poolKey: (adId: string) => `orchestrator:challenge_pool:${adId}`,
}));

import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import { resetRedisPoolCircuit } from "../lib/redis-pool-circuit.js";

beforeAll(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
    vi.restoreAllMocks();
});

beforeEach(() => {
    vi.clearAllMocks();
    resetRedisPoolCircuit();
    vi.mocked(prisma.$transaction).mockImplementation(
        async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma),
    );
    vi.mocked(prisma.$queryRaw).mockResolvedValue([1]);
    vi.mocked(redis.ping).mockResolvedValue("PONG");
});
