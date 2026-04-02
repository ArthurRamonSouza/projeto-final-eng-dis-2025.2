# Decisões técnicas e visão da solução

Este documento consolida o contexto do problema, a arquitetura adotada e as decisões de implementação da POC. A referência normativa para cada decisão permanece nos **ADRs** em `docs/adrs/`.

---

## 1. Contexto e objetivos

**Problema:** a geração de desafios com IA apresenta latência alta e variável. Acoplar a chamada ao modelo ao ciclo de vida do pedido HTTP síncrono expõe o cliente a timeouts e degradação percebida.

**Objetivos da POC (IA como pool):**

- Preservar resposta rápida ao consumidor final.
- Desacoplar a geração custosa da API síncrona.
- Introduzir resiliência via fallback, isolamento e proteção sob carga.

**Princípio operacional:** o sistema prioriza disponibilidade e baixa latência no consumo de desafios, mesmo quando a IA ou a fila se degradam.

---

## 2. Arquitetura

### 2.1 Componentes

| Componente | Tecnologia | Responsabilidade |
|------------|------------|------------------|
| **engine** | Node.js, Express | API principal: anúncios, consumo de desafio, saúde, métricas. |
| **ai-worker** | Python, FastAPI | Processamento assíncrono de jobs, chamada ao Gemini, escrita no Redis e persistência de fallback estático. |
| **Redis** | — | Pool de desafios, streams de refill, rate limit, controles de carga e DLQ. |
| **PostgreSQL** | — | Anúncios, jobs de geração, resultados e desafios estáticos. |

### 2.2 Fluxo principal

1. O cliente chama `GET /ads/:adId/challenge` na engine.
2. A engine consome do pool Redis (`POOL_KEY_PREFIX`).
3. Se o pool estiver vazio ou inválido, utiliza desafios estáticos no PostgreSQL.
4. Se o pool estiver abaixo do mínimo configurado, dispara refill assíncrono (BullMQ → Redis Stream → ai-worker).
5. O ai-worker gera desafios com o modelo e reabastece o pool.

---

## 3. Decisões técnicas

### 3.1 Desacoplamento assíncrono (ADR 01)

A geração não bloqueia o ciclo do pedido HTTP. O pipeline combina **BullMQ** na engine (`REFILL_BULLMQ_QUEUE_NAME`), publicação no **Redis Stream** (`REFILL_STREAM_KEY`) e consumo pelo **ai-worker**. A API permanece responsiva enquanto a geração ocorre em segundo plano.

### 3.2 Fallback, bulkhead e circuit breaker (ADR 02)

- **Fallback:** ausência de entrada válida no pool Redis leva a desafios estáticos persistidos no PostgreSQL.
- **Bulkhead:** engine e ai-worker em processos/containers distintos.
- **Isolamento:** redes Docker separadas (`postgres_net`, `redis_net`) e limites de recurso por serviço.
- **Circuit breakers:** `pybreaker` no ai-worker (chamadas LLM) e `opossum` na engine (operações do pool Redis).

### 3.3 Load shedding (ADR 03)

Sob backlog ou limites de concorrência, a engine pode responder **503** com `Retry-After`, além de lógica complementar baseada na saúde do worker (com cache). Rotas de leitura e observabilidade são tratadas com prioridade em relação à geração sob pressão.

### 3.4 Retry, DLQ e fila

- **ai-worker:** retentativas com backoff exponencial (Tenacity) para falhas transitórias.
- **BullMQ:** tentativas e backoff configuráveis nos jobs de refill.
- **DLQ:** falhas definitivas registradas em lista Redis (`AI_DLQ_LIST_KEY`).

### 3.5 Segurança e tráfego

- **Rate limit por IP** na engine (Redis + Lua), com isenções para rotas de saúde.
- Segredos e URLs sensíveis via variáveis de ambiente (por exemplo `GEMINI_API_KEY`), sem versionamento no repositório.

---

## 4. Variáveis de ambiente relevantes

### Núcleo

`DATABASE_URL`, `REDIS_QUEUE_URL`, `GEMINI_API_KEY`

### Pool e fila

`POOL_KEY_PREFIX`, `REFILL_BULLMQ_QUEUE_NAME`, `REFILL_STREAM_KEY`, `AI_DLQ_LIST_KEY`

### Retry e backoff

`AI_MAX_RETRIES`, `AI_RETRY_MIN_SEC`, `AI_RETRY_MAX_SEC`, `AI_RETRY_BACKOFF_MULTIPLIER`, `REFILL_QUEUE_ATTEMPTS`, `REFILL_QUEUE_BACKOFF_MS`

### Proteção de carga e limite de taxa

`RATE_LIMIT_ENABLED`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_SEC`, `LOAD_SHED_ENABLED`, `LOAD_SHED_MAX_WAITING`, `LOAD_SHED_CONCURRENT_MAX`, `LOAD_SHEDDING_ENABLED`, `AI_WORKER_BASE_URL`, `LOAD_SHEDDING_CACHE_MS`

Detalhes e valores exemplo: `.env.example` na raiz e `docker-compose.yml`.

---

## 5. Limitações conhecidas

- A combinação BullMQ + Redis Stream + worker Python aumenta a superfície operacional em relação a um único tipo de fila.
- Convivem duas famílias de variáveis relacionadas a descarte de carga (`LOAD_SHED_*` e `LOAD_SHEDDING_*`); a configuração deve seguir o código e os ADRs para evitar ambiguidade.
- A qualidade do fallback estático depende de dados curados no banco.

---

## 6. Referências

- [ADR 01 — Desacoplamento assíncrono](adrs/01-desacoplamento-fila-worker-assincrono.md)
- [ADR 02 — Fallback e isolamento](adrs/02-estrategia-fallback-isolamento-bulkhead.md)
- [ADR 03 — Load shedding](adrs/03-protecao-sobrecarga-load-shedding.md)
- [README.md](../README.md) — execução local e CI

---

*Última atualização: 2026-04-02.*
