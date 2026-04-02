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
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue("OK"),
        eval: vi.fn().mockResolvedValue([1, 59]),
        scan: vi.fn().mockResolvedValue(["0", []]),
    },
    poolKey: (adId: string) => `pool:ad:${adId}`,
}));

vi.mock("../queues/refill-queue.js", () => ({
    enqueueRefillJob: vi.fn().mockResolvedValue(undefined),
    getRefillQueueCounts: vi.fn().mockResolvedValue({
        waiting: 0,
        active: 0,
        delayed: 0,
        failed: 0,
        completed: 0,
    }),
    startRefillWorker: vi.fn(),
    closeRefillInfrastructure: vi.fn().mockResolvedValue(undefined),
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
