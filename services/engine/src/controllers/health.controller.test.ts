import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";

describe("HealthController (rotas /health)", () => {
    it("GET /health — liveness", async () => {
        const app = await createApp();
        const res = await request(app).get("/health");
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            service: "engine",
            status: "ok",
        });
    });

    it("GET /health/dependencies — postgres e redis ok", async () => {
        const app = await createApp();
        const res = await request(app).get("/health/dependencies");
        expect(res.status).toBe(200);
        expect(res.body.service).toBe("engine");
        expect(res.body.status).toBe("ok");
        expect(res.body.dependencies).toEqual({
            postgres: "ok",
            redis: "ok",
        });
        expect(prisma.$queryRaw).toHaveBeenCalled();
        expect(redis.ping).toHaveBeenCalled();
    });

    it("GET /health/dependencies — postgres em erro", async () => {
        vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error("db down"));
        const app = await createApp();
        const res = await request(app).get("/health/dependencies");
        expect(res.status).toBe(200);
        expect(res.body.dependencies.postgres).toBe("error");
        expect(res.body.dependencies.redis).toBe("ok");
    });

    it("GET /health/dependencies — redis em erro", async () => {
        vi.mocked(redis.ping).mockRejectedValueOnce(new Error("redis down"));
        const app = await createApp();
        const res = await request(app).get("/health/dependencies");
        expect(res.status).toBe(200);
        expect(res.body.dependencies.postgres).toBe("ok");
        expect(res.body.dependencies.redis).toBe("error");
    });

    it("GET /health/redis-pool-circuit — estado do circuit breaker do pool", async () => {
        const app = await createApp();
        const res = await request(app).get("/health/redis-pool-circuit");
        expect(res.status).toBe(200);
        expect(res.body.service).toBe("engine");
        expect(["open", "half_open", "closed"]).toContain(
            res.body.redis_challenge_pool_circuit,
        );
    });
});
