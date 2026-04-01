import { execSync } from "node:child_process";
import { beforeAll, describe, expect, it } from "vitest";

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";
const COMPOSE_PROJECT = process.env.COMPOSE_PROJECT ?? "projeto-final-eng-dis";
const POSTGRES_CONTAINER = `${COMPOSE_PROJECT}-postgres-1`;

/**
 * Insere desafios estáticos no PostgreSQL para garantir que o fallback
 * funcione independentemente do worker AI (ex.: chave Gemini não configurada).
 */
function seedStaticChallenges(adId: string, count = 3): void {
    for (let i = 0; i < count; i++) {
        const id = `st_int_${adId.slice(3, 11)}_${i}`;
        const sql = `INSERT INTO static_challenges (id, ad_id, type, question, options_json, correct_answer, source, status)
      VALUES ('${id}', '${adId}', 'multiple_choice', 'Pergunta de integração ${i + 1} sobre o produto?',
      '["Opção A","Opção B","Opção C","Opção D"]', 'Opção A', 'static', 'active')
      ON CONFLICT (id) DO NOTHING;`;

        execSync(`docker exec -i ${POSTGRES_CONTAINER} psql -U app -d app`, {
            input: sql,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
        });
    }
    console.log(
        `[seed] ${count} desafio(s) estático(s) inseridos para adId=${adId}`,
    );
}

async function waitForApi(retries = 15, delaySec = 2): Promise<void> {
    let lastError: unknown;
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(`${BASE_URL}/health`);
            if (res.ok) return;
        } catch (err) {
            lastError = err;
        }
        await sleep((i < retries - 1 ? delaySec : 0) * 1000);
    }
    throw new Error(
        `API não disponível em ${BASE_URL} após ${retries} tentativas.\n` +
            `Último erro: ${lastError}\n` +
            `Execute: docker compose up -d`,
    );
}

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

async function postJson(
    path: string,
    body: unknown,
): Promise<{ status: number; body: Record<string, unknown> }> {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    return {
        status: res.status,
        body: (await res.json()) as Record<string, unknown>,
    };
}

async function getJson(
    path: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
    const res = await fetch(`${BASE_URL}${path}`);
    return {
        status: res.status,
        body: (await res.json()) as Record<string, unknown>,
    };
}

describe("Integração — Fluxo ponta a ponta", () => {
    let adId: string;

    beforeAll(async () => {
        await waitForApi();
    });

    describe("Passo 1: GET /health", () => {
        it("retorna 200 com status 'ok' e service 'engine'", async () => {
            const { status, body } = await getJson("/health");
            expect(status).toBe(200);
            expect(body.status).toBe("ok");
            expect(body.service).toBe("engine");
        });
    });

    describe("Passo 2: POST /ads", () => {
        it("cria anúncio e retorna 201 com todos os campos obrigatórios", async () => {
            const { status, body } = await postJson("/ads", {
                title: "Teste do Produto X",
                advertiser_name: "Anunciante Exemplo Ltda",
                content_type: "text",
                content_text:
                    "Descubra o Produto X, a solução ideal para seu negócio crescer de forma sustentável.",
            });

            expect(status).toBe(201);

            const ad = body.ad as Record<string, unknown>;
            expect(ad.id).toMatch(/^ad_[0-9a-f]{16}$/);
            expect(ad.title).toBe("Teste do Produto X");
            expect(ad.status).toBe("active");
            expect(body.initial_refill_requested).toBe(true);

            const content = body.content as Record<string, unknown>;
            expect(content.id).toBeDefined();
            expect(content.content_type).toBe("text");

            adId = ad.id as string;
        });

        it("Fluxo A — job de refill inicial aparece em generation_jobs com status 'pending'", () => {
            if (!adId) throw new Error("adId não definido — Passo 2 falhou");
            const output = execSync(
                `docker exec ${POSTGRES_CONTAINER} psql -U app -d app -t -c "SELECT COUNT(*) FROM generation_jobs WHERE ad_id = '${adId}' AND status = 'pending'"`,
                { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
            ).trim();
            const count = parseInt(output.trim(), 10);
            console.log(
                `[Fluxo A] adId=${adId} → jobs pending no DB: ${count}`,
            );
            expect(count).toBeGreaterThanOrEqual(1);
        });

        it("payload vazio retorna 400 ou 422", async () => {
            const { status } = await postJson("/ads", {});
            expect([400, 422]).toContain(status);
        });

        it("ausência de content_text retorna 400 ou 422", async () => {
            const { status } = await postJson("/ads", {
                title: "X",
                advertiser_name: "Y",
                content_type: "text",
            });
            expect([400, 422]).toContain(status);
        });
    });

    describe("Passo 3: GET /ads — listagem e GET /ads/id-inexistente/challenge", () => {
        let listBody: Record<string, unknown>;

        beforeAll(async () => {
            if (!adId) throw new Error("adId não definido — Passo 2 falhou");
            const { body } = await getJson("/ads");
            listBody = body;
        });

        it("retorna 200 com campo 'items' do tipo array", async () => {
            const { status } = await getJson("/ads");
            expect(status).toBe(200);
            expect(Array.isArray(listBody.items)).toBe(true);
        });

        it("anúncio recém-criado está presente na lista", () => {
            const found = (listBody.items as Array<{ id: string }>).some(
                (item) => item.id === adId,
            );
            expect(found).toBe(true);
        });

        it("objeto do anúncio na lista tem campos obrigatórios", () => {
            const ad = (listBody.items as Array<Record<string, unknown>>).find(
                (item) => item.id === adId,
            );
            expect(ad).toBeDefined();
            expect(ad!.status).toBe("active");
            expect(ad!.advertiser_name).toBeDefined();
        });

        it("retorna 404 para adId que não existe em /challenge", async () => {
            const res = await fetch(
                `${BASE_URL}/ads/ad_0000000000000000/challenge`,
            );
            expect(res.status).toBe(404);
        });

        it("retorna 404 para adId que não existe em GET /ads/:adId", async () => {
            const { status } = await getJson("/ads/ad_0000000000000000");
            expect(status).toBe(404);
        });

        it("retorna 404 para adId que não existe em GET /ads/:adId/pool-status", async () => {
            const { status } = await getJson(
                "/ads/ad_0000000000000000/pool-status",
            );
            expect(status).toBe(404);
        });

        it("retorna 404 para adId que não existe em POST /ads/:adId/refill", async () => {
            const { status } = await postJson(
                "/ads/ad_0000000000000000/refill",
                {
                    requested_count: 3,
                },
            );
            expect(status).toBe(404);
        });
    });

    describe("Passo 3c: GET /ads/:adId — detalhe", () => {
        beforeAll(() => {
            if (!adId) throw new Error("adId não definido — Passo 2 falhou");
        });

        it("retorna 200 com os dados do anúncio criado", async () => {
            const { status, body } = await getJson(`/ads/${adId}`);
            expect(status).toBe(200);
            expect(body.id).toBe(adId);
            expect(body.status).toBe("active");
        });
    });

    describe("Passo 4: GET /ads/:adId/pool-status", () => {
        beforeAll(() => {
            if (!adId) throw new Error("adId não definido — Passo 2 falhou");
        });

        it("retorna 200 com ad_id e métricas numéricas do pool", async () => {
            const { status, body } = await getJson(`/ads/${adId}/pool-status`);
            expect(status).toBe(200);
            expect(body.ad_id).toBe(adId);
            expect(typeof body.pool_size).toBe("number");
            expect(body.pool_size as number).toBeGreaterThanOrEqual(0);
            expect(body.pool_min).toBeDefined();
            expect(body.pool_target).toBeDefined();
        });
    });

    describe("Passo 5: GET /ads/:adId/challenge — com retry", () => {
        beforeAll(() => {
            if (!adId) throw new Error("adId não definido — Passo 2 falhou");
            // Garante desafios estáticos como fallback caso o worker AI não tenha preenchido o pool
            seedStaticChallenges(adId);
        });

        it("retorna 200 com desafio válido após o worker processar o job inicial", async () => {
            const maxRetries = Number(process.env.CHALLENGE_MAX_RETRIES ?? 6);
            const retryDelaySec = Number(process.env.CHALLENGE_RETRY_SEC ?? 5);

            let lastStatus = 0;
            let body: Record<string, unknown> | null = null;
            let elapsedMs = 0;

            for (let i = 0; i < maxRetries; i++) {
                const start = Date.now();
                const res = await fetch(`${BASE_URL}/ads/${adId}/challenge`);
                elapsedMs = Date.now() - start;
                lastStatus = res.status;
                if (res.status === 200) {
                    body = (await res.json()) as Record<string, unknown>;
                    break;
                }
                if (i < maxRetries - 1) {
                    await sleep(retryDelaySec * 1000);
                }
            }

            console.log(
                `[Passo 5] HTTP ${lastStatus} | source=${(body?.challenge as Record<string, unknown>)?.source} | fallback_used=${body?.fallback_used} | elapsedMs=${elapsedMs}`,
            );
            expect(lastStatus).toBe(200);

            if (!body) return;

            const challenge = body.challenge as Record<string, unknown>;
            expect(typeof challenge.question).toBe("string");
            expect((challenge.question as string).length).toBeGreaterThan(0);
            expect(challenge.type).toBe("multiple_choice");
            expect(Array.isArray(challenge.options)).toBe(true);
            expect((challenge.options as unknown[]).length).toBe(4);
            expect(["ai", "static"]).toContain(challenge.source);

            if (challenge.source === "ai") {
                expect(body.fallback_used).toBe(false);
                // Fluxo B: pool cheio → entrega abaixo de 50 ms
                console.log(
                    `[Fluxo B] Entrega AI com pool cheio: ${elapsedMs}ms (limite: 50ms)`,
                );
                expect(elapsedMs).toBeLessThan(50);
            } else {
                expect(body.fallback_used).toBe(true);
                console.log(
                    `[Fluxo C] Entrega fallback estático: ${elapsedMs}ms`,
                );
            }

            expect(typeof body.pool_size_after_consume).toBe("number");
            expect(body.refill_requested).toBeDefined();
        }, 90_000);
    });

    describe("Passo 6: POST /ads/:adId/refill", () => {
        beforeAll(() => {
            if (!adId) throw new Error("adId não definido — Passo 2 falhou");
        });

        it("dispara refill manual e retorna 201 com job 'pending'", async () => {
            const { status, body } = await postJson(`/ads/${adId}/refill`, {
                requested_count: 3,
            });
            expect(status).toBe(201);

            const job = body.job as Record<string, unknown>;
            expect(job.job_id).toBeTruthy();
            expect(job.ad_id).toBe(adId);
            expect(job.requested_count).toBe(3);
            expect(job.reason).toBe("manual_refill");
            expect(job.status).toBe("pending");
        });

        it("requested_count negativo retorna 400 ou 422", async () => {
            const { status } = await postJson(`/ads/${adId}/refill`, {
                requested_count: -1,
            });
            expect([400, 422]).toContain(status);
        });

        it("pool-status indica refill_in_progress após refill manual", async () => {
            const { body } = await getJson(`/ads/${adId}/pool-status`);
            expect(body.refill_in_progress).toBe(true);
        });
    });

    describe("Passo 7: GET /health/dependencies", () => {
        it("retorna 200 com redis e postgres 'ok'", async () => {
            const { status, body } = await getJson("/health/dependencies");
            expect(status).toBe(200);
            expect(body.status).toBe("ok");

            const deps = body.dependencies as Record<string, string>;
            expect(deps.redis).toBe("ok");
            expect(deps.postgres).toBe("ok");
        });
    });
});
