import { execSync } from "node:child_process";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";
const COMPOSE_PROJECT = process.env.COMPOSE_PROJECT ?? "projeto-final-eng-dis";
const AI_WORKER_URL = process.env.AI_WORKER_URL ?? "http://localhost:8001";

const REDIS_CONTAINER = `${COMPOSE_PROJECT}-redis-1`;
const WORKER_CONTAINER = `${COMPOSE_PROJECT}-ai-worker-1`;
const POSTGRES_CONTAINER = `${COMPOSE_PROJECT}-postgres-1`;

function exec(cmd: string): string {
    return execSync(cmd, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
    });
}

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

async function waitForApi(retries = 15, delaySec = 2): Promise<void> {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(`${BASE_URL}/health`);
            if (res.ok) return;
        } catch {
            // Ignorar erros
        }
        await sleep(delaySec * 1000);
    }
    throw new Error(
        `API não disponível em ${BASE_URL}. Execute: docker compose up -d`,
    );
}

async function waitForWorker(retries = 10, delaySec = 2): Promise<void> {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(`${AI_WORKER_URL}/health`);
            if (res.ok) return;
        } catch {
            // Ignorar erros
        }
        await sleep(delaySec * 1000);
    }
    throw new Error(
        `Worker não disponível em ${AI_WORKER_URL}. Verifique se docker compose up está rodando.`,
    );
}

async function createTestAd(): Promise<string> {
    const res = await fetch(`${BASE_URL}/ads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title: "Anuncio Teste Resiliencia",
            advertiser_name: "Resiliencia Tester",
            content_type: "text",
            content_text:
                "Conteudo de teste para verificacao de resiliencia do sistema.",
        }),
    });
    if (!res.ok) {
        throw new Error(`Falha ao criar anúncio de teste: HTTP ${res.status}`);
    }
    const body = (await res.json()) as { ad: { id: string } };
    return body.ad.id;
}

function seedStaticChallenges(adId: string, count = 3): void {
    for (let i = 0; i < count; i++) {
        const id = `st_res_${adId.slice(3, 11)}_${i}`;
        const sql = `INSERT INTO static_challenges (id, ad_id, type, question, options_json, correct_answer, source, status)
      VALUES ('${id}', '${adId}', 'multiple_choice', 'Pergunta fallback ${i + 1} sobre o anúncio?',
      '["Opção A","Opção B","Opção C","Opção D"]', 'Opção A', 'static', 'active')
      ON CONFLICT (id) DO NOTHING;`;

        execSync(`docker exec -i ${POSTGRES_CONTAINER} psql -U app -d app`, {
            input: sql,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
        });
    }
}

function ensureContainerRunning(name: string): void {
    try {
        exec(`docker start ${name}`);
    } catch {
        // Ignorar erros
    }
}

beforeAll(async () => {
    await waitForApi();
});

describe("Cenário 1: Pool esgotado → fallback estático", () => {
    let adId: string;

    beforeAll(async () => {
        adId = await createTestAd();

        seedStaticChallenges(adId);

        exec(`docker exec ${REDIS_CONTAINER} redis-cli DEL pool:ad:${adId}`);
        await sleep(1000);
    });

    it("GET /ads/:adId/challenge com pool vazio retorna 200 via fallback estático", async () => {
        const res = await fetch(`${BASE_URL}/ads/${adId}/challenge`);

        expect(res.status).toBe(200);

        const body = (await res.json()) as {
            fallback_used: boolean;
            challenge: {
                source: string;
                type: string;
                question: string;
                options: string[];
            };
            pool_size_after_consume: number;
        };

        console.log(
            `[Cenário 1] adId=${adId} | source=${body.challenge.source} | fallback_used=${body.fallback_used} | pool_size_after_consume=${body.pool_size_after_consume}`,
        );
        expect(body.fallback_used).toBe(true);
        expect(body.challenge.source).toBe("static");
        expect(body.challenge.type).toBe("multiple_choice");
        expect(typeof body.challenge.question).toBe("string");
        expect(body.challenge.options).toHaveLength(4);
        expect(body.pool_size_after_consume).toBe(0);
    });

    it("múltiplas requisições seguidas com pool vazio retornam fallback sem erro", async () => {
        const results = await Promise.all(
            Array.from({ length: 3 }, () =>
                fetch(`${BASE_URL}/ads/${adId}/challenge`).then(
                    (r) => r.status,
                ),
            ),
        );

        for (const status of results) {
            expect(status).toBe(200);
        }
    });
});

describe("Cenário 2: IA indisponível → engine permanece responsivo", () => {
    afterEach(() => {
        ensureContainerRunning(WORKER_CONTAINER);
    });

    afterAll(async () => {
        ensureContainerRunning(WORKER_CONTAINER);

        await sleep(3000);
    });

    it("engine aceita refill request e cria job 'pending' mesmo com worker offline; sistema continua saudável", async () => {
        const adId = await createTestAd();
        console.log(`[Cenário 2] adId criado: ${adId}`);

        exec(`docker stop ${WORKER_CONTAINER}`);
        console.log(`[Cenário 2] Worker parado`);
        await sleep(1000);

        const refillRes = await fetch(`${BASE_URL}/ads/${adId}/refill`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requested_count: 3 }),
        });
        expect(refillRes.status).toBe(201);

        const refillBody = (await refillRes.json()) as {
            job: {
                status: string;
                job_id: string;
                ad_id: string;
                requested_count: number;
            };
        };

        expect(refillBody.job.status).toBe("pending");
        expect(refillBody.job.ad_id).toBe(adId);
        expect(refillBody.job.requested_count).toBe(3);
        console.log(
            `[Cenário 2] Job criado id=${refillBody.job.job_id} status=${refillBody.job.status}`,
        );

        await sleep(5000);

        const healthRes = await fetch(`${BASE_URL}/health`);
        expect(healthRes.status).toBe(200);
        const healthBody = (await healthRes.json()) as { status: string };
        console.log(
            `[Cenário 2] Health após 5s: ${JSON.stringify(healthBody)}`,
        );
        expect(healthBody.status).toBe("ok");
    }, 30_000);

    it("desafios estáticos continuam sendo servidos com worker offline", async () => {
        const adId = await createTestAd();
        seedStaticChallenges(adId);

        exec(`docker exec ${REDIS_CONTAINER} redis-cli DEL pool:ad:${adId}`);

        exec(`docker stop ${WORKER_CONTAINER}`);
        await sleep(1000);

        const res = await fetch(`${BASE_URL}/ads/${adId}/challenge`);
        expect(res.status).toBe(200);

        const body = (await res.json()) as {
            fallback_used: boolean;
            challenge: { source: string };
        };
        expect(body.fallback_used).toBe(true);
        expect(body.challenge.source).toBe("static");
    }, 30_000);

    it("Fluxo D — worker marca job como 'failed' em generation_results quando geração falha", async () => {
        ensureContainerRunning(WORKER_CONTAINER);
        await sleep(3000);
        await waitForWorker(10, 1);

        const noContentAdId = `ad_noctnt${Date.now().toString(16).slice(-8)}`;
        execSync(`docker exec -i ${POSTGRES_CONTAINER} psql -U app -d app`, {
            input: `INSERT INTO ads (id, title, advertiser_name, status, created_at) VALUES ('${noContentAdId}', 'Ad sem conteudo', 'Tester', 'active', NOW());`,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
        });
        const jobId = `test_fail_${Date.now()}`;
        console.log(`[Fluxo D] adId sem conteúdo: ${noContentAdId}`);

        const res = await fetch(`${AI_WORKER_URL}/internal/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ad_id: noContentAdId,
                job_id: jobId,
                requested_count: 1,
            }),
        });

        console.log(
            `[Fluxo D] POST /internal/generate respondeu HTTP ${res.status}`,
        );
        expect([500, 503]).toContain(res.status);

        const output = execSync(
            `docker exec ${POSTGRES_CONTAINER} psql -U app -d app -t -c "SELECT COUNT(*) FROM generation_results WHERE job_id = '${jobId}' AND status = 'failed'"`,
            { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
        ).trim();
        const count = parseInt(output.trim(), 10);
        console.log(
            `[Fluxo D] jobId=${jobId} → linhas failed em generation_results: ${count}`,
        );
        expect(count).toBeGreaterThanOrEqual(1);
    }, 20_000);
});

describe("Cenário 3: Redis indisponível → fallback PostgreSQL + recuperação", () => {
    let adId: string;

    beforeAll(async () => {
        adId = await createTestAd();

        seedStaticChallenges(adId);
    });

    afterEach(async () => {
        ensureContainerRunning(REDIS_CONTAINER);
        await sleep(4000);
    });

    afterAll(async () => {
        ensureContainerRunning(REDIS_CONTAINER);
        await sleep(5000);
    });

    it("GET /challenge com Redis offline retorna 200 via fallback PostgreSQL", async () => {
        const countSql = `SELECT COUNT(*) FROM static_challenges WHERE ad_id = '${adId}'`;
        const countOutput = execSync(
            `docker exec ${POSTGRES_CONTAINER} psql -U app -d app -t -c "${countSql}"`,
            { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
        ).trim();
        const staticCount = parseInt(countOutput.trim(), 10);
        console.log(
            `[Cenário 3] Verificado: ${staticCount} desafios estáticos no DB para adId=${adId}`,
        );
        expect(staticCount).toBeGreaterThanOrEqual(1);

        exec(`docker stop --time 3 ${REDIS_CONTAINER}`);
        console.log(`[Cenário 3] Redis parado`);

        await sleep(6000);

        let res: Response | null = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
            res = await fetch(`${BASE_URL}/ads/${adId}/challenge`);
            console.log(
                `[Cenário 3] tentativa ${attempt} → HTTP ${res.status}`,
            );
            if (res.status === 200) break;
            await sleep(2000);
        }

        expect(res!.status).toBe(200);

        const body = (await res!.json()) as {
            fallback_used: boolean;
            challenge: {
                source: string;
                type: string;
                question: string;
                options: string[];
            };
        };
        console.log(
            `[Cenário 3] source=${body.challenge.source} | fallback_used=${body.fallback_used}`,
        );
        expect(body.fallback_used).toBe(true);
        expect(body.challenge.source).toBe("static");
        expect(body.challenge.type).toBe("multiple_choice");
        expect(body.challenge.options).toHaveLength(4);
    }, 90_000);

    it("GET /health/dependencies mostra redis='error' e postgres='ok' com Redis offline", async () => {
        exec(`docker stop ${REDIS_CONTAINER}`);
        await sleep(3000);

        const res = await fetch(`${BASE_URL}/health/dependencies`);
        const body = (await res.json()) as {
            dependencies: { redis: string; postgres: string };
        };
        console.log(`[Cenário 3 health] ${JSON.stringify(body.dependencies)}`);
        expect(res.status).toBe(200);
        expect(body.dependencies.redis).toBe("error");
        expect(body.dependencies.postgres).toBe("ok");
    }, 45_000);

    it("Redis volta a 'ok' no health após docker start e reconexão", async () => {
        exec(`docker stop ${REDIS_CONTAINER}`);
        await sleep(2000);

        exec(`docker start ${REDIS_CONTAINER}`);

        await sleep(12000);

        const res = await fetch(`${BASE_URL}/health/dependencies`);
        const body = (await res.json()) as {
            dependencies: { redis: string };
        };
        expect(res.status).toBe(200);
        expect(body.dependencies.redis).toBe("ok");
    }, 40_000);
});

describe("Cenário 4: ai-worker isolado do Redis → backlog; após reconexão, job conclui", () => {
    let adId: string;

    beforeAll(async () => {
        adId = await createTestAd();
    });

    afterEach(async () => {
        try {
            exec(
                `docker network connect projeto-final-eng-dis_redis_net ${WORKER_CONTAINER}`,
            );
        } catch {
            // Ignorar se já está conectado
        }
        await sleep(2000);
    });

    afterAll(async () => {
        try {
            exec(
                `docker network connect projeto-final-eng-dis_redis_net ${WORKER_CONTAINER}`,
            );
        } catch {
            // Ignorar
        }
        await sleep(3000);
    });

    /**
     * Desliga `ai-worker` da rede `redis_net` (sem Redis: não consome stream nem chama o fluxo normal).
     * A engine continua com Redis e enfileira o refill no stream.
     * Ao reconectar o worker, o job é processado e o Gemini costuma responder: status `completed`.
     *
     * Nota: isto não simula “Gemini indisponível”; para abrir o pybreaker do LLM seria preciso falhas
     * repetidas na chamada ao modelo, não perda de conectividade ao Redis.
     */
    it("com worker desconectado do Redis o refill fica pendente; após reconexão o job completa", async () => {
        try {
            exec(
                `docker network disconnect projeto-final-eng-dis_redis_net ${WORKER_CONTAINER}`,
            );
            console.log(`[Cenário 4] Worker desconectado da rede (redis_net)`);
        } catch {
            console.log(
                `[Cenário 4] Worker já estava desconectado ou a rede não foi encontrada.`,
            );
        }

        await sleep(3000);

        const refillRes = await fetch(`${BASE_URL}/ads/${adId}/refill`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requested_count: 1 }),
        });
        expect(refillRes.status).toBe(201);

        const refillBody = (await refillRes.json()) as {
            job: { job_id: string; status: string };
        };
        const jobId = refillBody.job.job_id;
        console.log(
            `[Cenário 4] Job criado: ${jobId} (worker sem Redis não consome o stream ainda)`,
        );

        await sleep(2000);

        try {
            exec(
                `docker network connect projeto-final-eng-dis_redis_net ${WORKER_CONTAINER}`,
            );
        } catch {
            // Ignorar se já está conectado
        }
        console.log(`[Cenário 4] Worker reconectado à rede (redis_net)`);

        await sleep(20000);

        const jobStatus = execSync(
            `docker exec ${POSTGRES_CONTAINER} psql -U app -d app -t -c "SELECT status FROM generation_jobs WHERE job_id = '${jobId}'"`,
            { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
        ).trim();

        console.log(`[Cenário 4] Job ${jobId} status no DB: ${jobStatus}`);
        expect(jobStatus).toBe("completed");

        const healthRes = await fetch(`${AI_WORKER_URL}/health`);
        const healthBody = (await healthRes.json()) as {
            circuit_breaker: string;
        };
        console.log(
            `[Cenário 4] Circuit breaker state: ${healthBody.circuit_breaker}`,
        );
        expect(String(healthBody.circuit_breaker).toLowerCase()).toContain(
            "closed",
        );
    }, 70_000);
});
