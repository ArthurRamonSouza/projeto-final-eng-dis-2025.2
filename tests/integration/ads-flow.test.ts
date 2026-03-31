import { beforeAll, describe, expect, it } from "vitest";

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";

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

  describe("Passo 2: POST /ads — caminho feliz", () => {
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

      adId = ad.id as string;
    });
  });

  describe("Passo 2b: POST /ads — payloads inválidos", () => {
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

  describe("Passo 3: GET /ads — listagem", () => {
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
  });

  describe("Passo 3b: GET /ads/id-inexistente/challenge", () => {
    it("retorna 404 para adId que não existe", async () => {
      const res = await fetch(`${BASE_URL}/ads/ad_0000000000000000/challenge`);
      expect(res.status).toBe(404);
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
});
