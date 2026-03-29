import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";

const sampleAd = {
    id: "ad_existing",
    title: "Campanha",
    advertiserName: "Marca",
    status: "active",
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
};

const sampleContent = {
    id: "content_c1",
    adId: "ad_new",
    contentType: "transcript",
    contentText: "texto",
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
};

const sampleJob = {
    jobId: "job_j1",
    adId: "ad_new",
    requestedCount: 10,
    reason: "initial_fill",
    status: "pending",
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    updatedAt: new Date("2025-01-01T00:00:00.000Z"),
};

describe("AdsController (rotas /ads)", () => {
    it("POST /ads — cria anúncio e conteúdo (201)", async () => {
        vi.mocked(prisma.ad.create).mockResolvedValue({
            ...sampleAd,
            id: "ad_new",
            title: "Título",
            advertiserName: "Anunciante",
        });
        vi.mocked(prisma.adContent.create).mockResolvedValue(sampleContent);
        vi.mocked(prisma.generationJob.create).mockResolvedValue(sampleJob);

        const app = await createApp();
        const res = await request(app).post("/ads").send({
            title: "Título",
            advertiser_name: "Anunciante",
            content_type: "transcript",
            content_text: "texto do anúncio",
        });

        expect(res.status).toBe(201);
        expect(res.body.ad.title).toBe("Título");
        expect(res.body.ad.advertiser_name).toBe("Anunciante");
        expect(res.body.ad.status).toBe("active");
        expect(res.body.content.content_type).toBe("transcript");
        expect(res.body.initial_refill_requested).toBe(true);
    });

    it("POST /ads — body inválido (400)", async () => {
        const app = await createApp();
        const res = await request(app).post("/ads").send({ title: "" });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("VALIDATION_ERROR");
    });

    it("GET /ads — lista anúncios", async () => {
        vi.mocked(prisma.ad.findMany).mockResolvedValue([sampleAd]);
        const app = await createApp();
        const res = await request(app).get("/ads");
        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(1);
        expect(res.body.items[0].id).toBe("ad_existing");
        expect(res.body.items[0].advertiser_name).toBe("Marca");
    });

    it("GET /ads/:adId — detalhe", async () => {
        vi.mocked(prisma.ad.findUnique).mockResolvedValue(sampleAd);
        const app = await createApp();
        const res = await request(app).get("/ads/ad_existing");
        expect(res.status).toBe(200);
        expect(res.body.id).toBe("ad_existing");
    });

    it("GET /ads/:adId — não encontrado (404)", async () => {
        vi.mocked(prisma.ad.findUnique).mockResolvedValue(null);
        const app = await createApp();
        const res = await request(app).get("/ads/unknown");
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("AD_NOT_FOUND");
    });

    it("GET /ads/:adId/challenge — desafio vindo do Redis (IA)", async () => {
        vi.mocked(prisma.ad.findUnique).mockResolvedValue(sampleAd);
        vi.mocked(redis.rpop as (key: string) => Promise<string | null>).mockImplementation(() =>
            Promise.resolve(
                JSON.stringify({
                    id: "ch_1",
                    type: "multiple_choice",
                    question: "Pergunta?",
                    options: ["A", "B"],
                    source: "ai",
                }),
            ),
        );
        vi.mocked(redis.llen).mockResolvedValue(5);
        vi.mocked(prisma.generationJob.count).mockResolvedValue(0);

        const app = await createApp();
        const res = await request(app).get("/ads/ad_existing/challenge");
        expect(res.status).toBe(200);
        expect(res.body.fallback_used).toBe(false);
        expect(res.body.challenge.source).toBe("ai");
        expect(res.body.pool_size_after_consume).toBe(5);
    });

    it("GET /ads/:adId/challenge — fallback estático", async () => {
        vi.mocked(prisma.ad.findUnique).mockResolvedValue(sampleAd);
        vi.mocked(redis.rpop).mockResolvedValue(null);
        vi.mocked(prisma.staticChallenge.findMany).mockResolvedValue([
            {
                id: "st_1",
                adId: "ad_existing",
                type: "multiple_choice",
                question: "Q?",
                optionsJson: ["A", "B", "C"],
                correctAnswer: "A",
                source: "static",
                status: "active",
                createdAt: new Date(),
            },
        ]);
        vi.mocked(prisma.challengeConsumptionLog.create).mockResolvedValue({
            id: "log_1",
            challengeId: "st_1",
            adId: "ad_existing",
            source: "static",
            consumedAt: new Date(),
        });
        vi.mocked(redis.llen).mockResolvedValue(0);
        vi.mocked(prisma.generationJob.count).mockResolvedValue(1);

        const app = await createApp();
        const res = await request(app).get("/ads/ad_existing/challenge");
        expect(res.status).toBe(200);
        expect(res.body.fallback_used).toBe(true);
        expect(res.body.challenge.source).toBe("static");
    });

    it("GET /ads/:adId/challenge — nenhum desafio (404)", async () => {
        vi.mocked(prisma.ad.findUnique).mockResolvedValue(sampleAd);
        vi.mocked(redis.rpop).mockResolvedValue(null);
        vi.mocked(prisma.staticChallenge.findMany).mockResolvedValue([]);

        const app = await createApp();
        const res = await request(app).get("/ads/ad_existing/challenge");
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("NO_CHALLENGE_AVAILABLE");
    });

    it("GET /ads/:adId/pool-status — estado do pool", async () => {
        vi.mocked(prisma.ad.findUnique).mockResolvedValue(sampleAd);
        vi.mocked(redis.llen).mockResolvedValue(2);
        vi.mocked(prisma.generationJob.count).mockResolvedValue(0);

        const app = await createApp();
        const res = await request(app).get("/ads/ad_existing/pool-status");
        expect(res.status).toBe(200);
        expect(res.body.ad_id).toBe("ad_existing");
        expect(res.body.pool_size).toBe(2);
        expect(res.body.refill_needed).toBe(true);
    });

    it("POST /ads/:adId/refill — job manual (201)", async () => {
        vi.mocked(prisma.ad.findUnique).mockResolvedValue(sampleAd);
        vi.mocked(prisma.generationJob.create).mockResolvedValue({
            jobId: "job_manual",
            adId: "ad_existing",
            requestedCount: 5,
            reason: "manual_refill",
            status: "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const app = await createApp();
        const res = await request(app).post("/ads/ad_existing/refill").send({
            requested_count: 5,
        });
        expect(res.status).toBe(201);
        expect(res.body.job.job_id).toBe("job_manual");
        expect(res.body.job.reason).toBe("manual_refill");
    });

    it("POST /ads/:adId/refill — body inválido (400)", async () => {
        vi.mocked(prisma.ad.findUnique).mockResolvedValue(sampleAd);
        const app = await createApp();
        const res = await request(app).post("/ads/ad_existing/refill").send({
            requested_count: -1,
        });
        expect(res.status).toBe(400);
    });
});
