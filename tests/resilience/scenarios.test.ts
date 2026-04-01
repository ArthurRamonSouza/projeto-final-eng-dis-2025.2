import { execSync } from "node:child_process";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";
const COMPOSE_PROJECT = process.env.COMPOSE_PROJECT ?? "projeto-final-eng-dis";

const REDIS_CONTAINER = `${COMPOSE_PROJECT}-redis-1`;
const WORKER_CONTAINER = `${COMPOSE_PROJECT}-ai-worker-1`;
const POSTGRES_CONTAINER = `${COMPOSE_PROJECT}-postgres-1`;

function exec(cmd: string): string {
  return execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForApi(retries = 15, delaySec = 2): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) return;
    } catch {}
    await sleep(delaySec * 1000);
  }
  throw new Error(
    `API não disponível em ${BASE_URL}. Execute: docker compose up -d`,
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
  } catch {}
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
        fetch(`${BASE_URL}/ads/${adId}/challenge`).then((r) => r.status),
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

    exec(`docker stop ${WORKER_CONTAINER}`);
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

    await sleep(5000);

    const healthRes = await fetch(`${BASE_URL}/health`);
    expect(healthRes.status).toBe(200);
    const healthBody = (await healthRes.json()) as { status: string };
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
    exec(`docker stop ${REDIS_CONTAINER}`);
    await sleep(3000);

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
    };
    expect(body.fallback_used).toBe(true);
    expect(body.challenge.source).toBe("static");
    expect(body.challenge.type).toBe("multiple_choice");
    expect(body.challenge.options).toHaveLength(4);
  }, 30_000);

  it("GET /health/dependencies mostra redis='error' e postgres='ok' com Redis offline", async () => {
    exec(`docker stop ${REDIS_CONTAINER}`);
    await sleep(3000);

    const res = await fetch(`${BASE_URL}/health/dependencies`);
    const body = (await res.json()) as {
      dependencies: { redis: string; postgres: string };
    };
    expect(res.status).toBe(200);
    expect(body.dependencies.redis).toBe("error");
    expect(body.dependencies.postgres).toBe("ok");
  }, 30_000);

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
