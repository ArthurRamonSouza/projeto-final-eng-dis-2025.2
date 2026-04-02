# Plano de Testes

Descreve a estratégia, as camadas, os critérios de aceitação e os comandos de execução para todos os testes do projeto.

---

## 1. Visão Geral

O projeto adota quatro camadas de teste complementares, cada uma validando um nível diferente do sistema:

| Camada             | Ferramenta         | Escopo                                         | Requer infra         |
| ------------------ | ------------------ | ---------------------------------------------- | -------------------- |
| **Unitários**      | Vitest + Supertest | Controllers isolados via mocks                 | Não                  |
| **Integração E2E** | Vitest             | Fluxo ponta a ponta pela API real              | Sim (Docker Compose) |
| **Resiliência**    | Vitest             | Comportamento sob falhas de infraestrutura     | Sim (Docker Compose) |
| **Carga**          | k6                 | Latência, throughput e estabilidade sob volume | Sim (Docker Compose) |

As decisões que motivam esses cenários estão documentadas nos ADRs:

- [ADR 01](adrs/01-desacoplamento-fila-worker-assincrono.md) — Desacoplamento via fila e worker assíncrono
- [ADR 02](adrs/02-estrategia-fallback-isolamento-bulkhead.md) — Fallback e isolamento (bulkhead)
- [ADR 03](adrs/03-protecao-sobrecarga-load-shedding.md) — Load shedding

---

## 2. Testes Unitários — `services/engine/src/**/*.test.ts`

Executam com dependências (Prisma, Redis) totalmente mockadas via `vi.mock`. Não exigem Docker.

### Configuração

```bash
# A partir de services/engine/
npm run test          # execução única
npm run test:watch    # modo watch
```

> Setup: `src/test/env-bootstrap.ts` + `src/test/setup.ts` (carrega variáveis de ambiente e configura mocks globais antes de cada suite).

---

### `health.controller.test.ts`

| Teste                                              | Comportamento esperado                                                            |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| `GET /health` — liveness                           | 200 com `{ status: "ok", service: "engine" }`                                     |
| `GET /health/dependencies` — postgres e redis ok   | 200; chama `prisma.$queryRaw` e `redis.ping`; retorna ambos `"ok"`                |
| `GET /health/dependencies` — postgres em erro      | `prisma.$queryRaw` lança exceção → `postgres: "error"`, `redis: "ok"`, status 200 |
| `GET /health/dependencies` — redis em erro         | `redis.ping` lança exceção → `postgres: "ok"`, `redis: "error"`, status 200       |
| `GET /health/redis-pool-circuit` — circuit breaker | 200; campo `redis_challenge_pool_circuit` é `"open"`, `"half_open"` ou `"closed"` |

---

### `ads.controller.test.ts`

| Teste                                              | Comportamento esperado                                                                                                             |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `POST /ads` — criação válida                       | 201; body contém `ad.title`, `ad.advertiser_name`, `ad.status: "active"`, `content.content_type`, `initial_refill_requested: true` |
| `POST /ads` — body inválido                        | 400 com `error: "VALIDATION_ERROR"`                                                                                                |
| `GET /ads` — listagem                              | 200; `items[]` com campos `id` e `advertiser_name` corretos                                                                        |
| `GET /ads/:adId` — detalhe existente               | 200 com `id` do anúncio                                                                                                            |
| `GET /ads/:adId` — não encontrado                  | 404 com `error: "AD_NOT_FOUND"`                                                                                                    |
| `GET /ads/:adId/challenge` — desafio do Redis (IA) | 200; `fallback_used: false`, `challenge.source: "ai"`, `pool_size_after_consume` igual ao `llen` mockado                           |
| `GET /ads/:adId/challenge` — fallback estático     | Redis vazio (`rpop` → null) → busca `staticChallenge`; 200 com `fallback_used: true`, `challenge.source: "static"`                 |
| `GET /ads/:adId/challenge` — sem desafios          | Redis vazio e `staticChallenge` vazio → 404 com `error: "NO_CHALLENGE_AVAILABLE"`                                                  |
| `GET /ads/:adId/pool-status` — estado do pool      | 200; campos `ad_id`, `pool_size` (igual ao `llen`), `refill_needed`                                                                |
| `POST /ads/:adId/refill` — refill manual válido    | 201; `job.job_id`, `job.reason: "manual_refill"`                                                                                   |
| `POST /ads/:adId/refill` — body inválido           | 400                                                                                                                                |

---

## 3. Testes de Integração E2E — `tests/integration/ads-flow.test.ts`

Fluxo ponta a ponta sequencial contra a stack completa. Cada passo depende do anterior.

**Pré-requisito:** `docker compose up -d`

```bash
# A partir de services/engine/
npm run test:integration

# Com verbose
npm run test:integration -- --reporter=verbose
```

**Variáveis de ambiente:**

| Variável                | Padrão                  |
| ----------------------- | ----------------------- |
| `API_BASE_URL`          | `http://localhost:8000` |
| `COMPOSE_PROJECT`       | `projeto-final-eng-dis` |
| `CHALLENGE_MAX_RETRIES` | `6`                     |
| `CHALLENGE_RETRY_SEC`   | `5`                     |

### Critérios de aceitação

| Passo                                    | Critério                                                                                                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Passo 1** `GET /health`                | 200, `status: "ok"`, `service: "engine"`                                                                                                                           |
| **Passo 2** `POST /ads`                  | 201; `ad.id` no formato `ad_[16 hex]`; `initial_refill_requested: true`; campos de `content` presentes                                                             |
| **Fluxo A** — job inicial no DB          | `generation_jobs` tem ≥ 1 linha `pending` para o `adId` criado                                                                                                     |
| **Passo 2** — validação                  | Payload vazio ou sem `content_text` → 400 ou 422                                                                                                                   |
| **Passo 3** `GET /ads`                   | 200; anúncio recém-criado presente na lista com campos obrigatórios                                                                                                |
| **Passo 3** — 404 em IDs inexistentes    | `challenge`, `GET /:adId`, `pool-status`, `refill` com ID fictício → todos 404                                                                                     |
| **Passo 3b** `GET /ads/:adId`            | 200 com os dados do anúncio criado                                                                                                                                 |
| **Passo 4** `GET /ads/:adId/pool-status` | 200; `pool_size ≥ 0`, `pool_min` e `pool_target` presentes                                                                                                         |
| **Passo 5** `GET /ads/:adId/challenge`   | 200 com `question`, `type: "multiple_choice"`, 4 `options`; **Fluxo B** (`source: "ai"`): latência < 50ms; **Fluxo C** (`source: "static"`): `fallback_used: true` |
| **Passo 6** `POST /ads/:adId/refill`     | 201; `job.status: "pending"`, `reason: "manual_refill"`; `requested_count` negativo → 400/422; `pool-status` indica `refill_in_progress: true`                     |
| **Passo 7** `GET /health/dependencies`   | 200; `redis: "ok"`, `postgres: "ok"`                                                                                                                               |

---

## 4. Testes de Resiliência — `tests/resilience/scenarios.test.ts`

Manipulam containers Docker para simular falhas reais de infraestrutura. Executam em processo único (sem paralelismo) para evitar interferência entre cenários.

**Pré-requisito:** `docker compose up -d`

```bash
# A partir de services/engine/
npm run test:resilience
```

**Variáveis de ambiente:**

| Variável          | Padrão                  |
| ----------------- | ----------------------- |
| `API_BASE_URL`    | `http://localhost:8000` |
| `AI_WORKER_URL`   | `http://localhost:8001` |
| `COMPOSE_PROJECT` | `projeto-final-eng-dis` |

### Cenário 1 — Pool esgotado → fallback estático

> Valida ADR 02: sistema entrega via PostgreSQL quando Redis não tem desafios.

| Critério                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------ |
| `GET /challenge` com pool vazio → 200, `fallback_used: true`, `source: "static"`, 4 opções, `pool_size_after_consume: 0` |
| 3 requisições concorrentes com pool vazio → todas 200                                                                    |

### Cenário 2 — IA indisponível → engine permanece responsivo

> Valida ADR 01 e ADR 02: desacoplamento via fila; engine continua aceitando e respondendo mesmo sem worker.

| `it` block                                     | Critério                                                                                                                                                                                            |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine aceita refill com worker offline        | `POST /refill` com worker parado → 201, `job.status: "pending"`, `job.ad_id` correto; `GET /health` após 5s → 200, `status: "ok"` (engine não depende do worker para responder)                     |
| Desafios estáticos servidos com worker offline | `GET /challenge` com pool vazio + worker parado → 200, `fallback_used: true`, `source: "static"`                                                                                                    |
| **Fluxo D** — falha de geração registrada      | Worker online; anúncio sem conteúdo inserido diretamente no banco; `POST /internal/generate` para esse anúncio → worker retorna 500/503; `generation_results` registra ≥ 1 linha `status: "failed"` |

### Cenário 3 — Redis indisponível → fallback PostgreSQL + recuperação

> Valida ADR 02: degradação parcial visível no health; reconexão automática sem reinício da engine.

| `it` block                 | Critério                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Fallback com Redis offline | `docker stop` no Redis; `GET /challenge` → 200, `fallback_used: true`, `source: "static"`, 4 opções        |
| Health reflete degradação  | `docker stop` no Redis; `GET /health/dependencies` → 200, `redis: "error"`, `postgres: "ok"`               |
| Reconexão automática       | `docker stop` + `docker start` no Redis + 12s de espera → `GET /health/dependencies` retorna `redis: "ok"` |

### Cenário 4 — API Gemini indisponível → Circuit Breaker ativado

> Valida ADR 02 (bulkhead/circuit breaker no worker): isolamento de falha externa; job marcado como `failed`.

| `it` block                                | Critério                                                                                                                                                                                            |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Circuit Breaker abre por partição de rede | Worker desconectado da rede Docker; `POST /refill` → job `pending`; worker reconectado e aguarda 20s; job no DB muda para `status: "failed"`; `/health` do worker retorna `circuit_breaker: "open"` |

---

## 5. Testes de Carga — `tests/load-test.js`

Executados com k6. Validam latência, estabilidade e comportamento sob volume (ADR 03 — load shedding).

**Pré-requisito:** `docker compose up -d`

Pool Redis ativo. Simula leitura e escrita concorrente sob alta concorrência.

**Estágios:** 0 → 50 VUs (30s) → 100 VUs (1min) → 0 (30s)

```bash
# k6 local
k6 run tests/load-test.js

# Via Docker (sem instalar k6)
docker run --rm -i --network host grafana/k6 run - < tests/load-test.js
```

**Thresholds (critérios de aceitação):**

| Métrica                      | Threshold                                 |
| ---------------------------- | ----------------------------------------- |
| `http_req_duration` p(95)    | < 50ms                                    |
| `list_ads_latency` p(95)     | < 200ms                                   |
| `challenge_latency` p(95)    | < 50ms                                    |
| `http_errors` (status ≥ 500) | < 1%                                      |
| `fallback_used_rate`         | < 100% (pool não pode estar sempre vazio) |

**Checks por endpoint:**

| Endpoint                   | Checks                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------ |
| `GET /ads`                 | 200 ou 429; body tem `items[]`                                                       |
| `POST /ads` (10% dos VUs)  | 201 ou 429; em 429, presença de `Retry-After` ou body de erro                        |
| `GET /ads/:adId/challenge` | 200, 404 ou 429; em 200, `challenge.question` (string) e `challenge.options` (array) |

## 7. Referência rápida de comandos

```bash
# Unitários (sem Docker)
cd services/engine
npm run test

# Integração E2E (requer docker compose up -d)
npm run test:integration

# Resiliência (requer docker compose up -d)
npm run test:resilience

# Carga padrão (requer docker compose up -d)
docker run --rm -i --network host grafana/k6 run - < tests/load-test.js

```

> Para detalhes da cobertura por teste individual, consulte [testing-coverage.md](testing-coverage.md).
