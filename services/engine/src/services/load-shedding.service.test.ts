import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    isSheddingLoad,
    resetLoadSheddingCache,
} from "./load-shedding.service.js";

describe("load-shedding.service", () => {
    beforeEach(() => {
        resetLoadSheddingCache();
        process.env.LOAD_SHEDDING_ENABLED = "true";
        process.env.AI_WORKER_BASE_URL = "http://localhost:8001";
        process.env.LOAD_SHEDDING_HEALTH_TIMEOUT_MS = "500";
        process.env.LOAD_SHEDDING_CACHE_MS = "60000";
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    status: "ok",
                    redis: "up",
                    circuit_breaker: "closed",
                }),
            } as Response),
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        resetLoadSheddingCache();
        process.env.LOAD_SHEDDING_ENABLED = "false";
    });

    it("retorna false quando o health do worker está saudável", async () => {
        await expect(isSheddingLoad()).resolves.toBe(false);
        expect(fetch).toHaveBeenCalledWith(
            "http://localhost:8001/health",
            expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );
    });

    it("retorna true quando o circuit breaker do worker está aberto", async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                status: "ok",
                redis: "up",
                circuit_breaker: "open",
            }),
        } as Response);
        await expect(isSheddingLoad()).resolves.toBe(true);
    });

    it("retorna true quando o fetch falha", async () => {
        vi.mocked(fetch).mockRejectedValueOnce(new Error("network"));
        await expect(isSheddingLoad()).resolves.toBe(true);
    });
});
