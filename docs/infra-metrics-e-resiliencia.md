# Infra, filas, descarte de carga e métricas (Critério 4)

## Fila BullMQ (Engine)

Os jobs de refill (`initial_fill`, `refill`, `manual_refill`) passam pela fila **BullMQ** (`REFILL_BULLMQ_QUEUE_NAME`, prefixo Redis `BULLMQ_PREFIX`). Um **Worker** na mesma API publica no **Redis Stream** (`REFILL_STREAM_KEY`), mantendo o consumidor Python (`ai-worker`) inalterado.

- **Retries**: `REFILL_QUEUE_ATTEMPTS` / `REFILL_QUEUE_BACKOFF_MS`.
- **DLQ (lado Node)**: jobs que esgotam tentativas ficam em estado `failed` no BullMQ — ver contagem em `GET /metrics/summary` → `refill_queue_bullmq.failed`.

## Descarte de carga (Engine)

Middleware aplicado após métricas HTTP e antes do rate limit por IP:

- Se `waiting + delayed` na fila BullMQ &gt; `LOAD_SHED_MAX_WAITING` → **503** + `Retry-After`.
- Opcional: `LOAD_SHED_CONCURRENT_MAX` &gt; 0 ativa slots globais no Redis (`engine:load:concurrent_slots`).

Rotas `/health/*` e `/metrics/*` estão isentas.

## DLQ (lado Python / IA)

Falhas definitivas em `process_job_payload` (após atualizar o job na BD como `failed`) são gravadas na lista Redis `AI_DLQ_LIST_KEY` (default `dlq:ai:refill`), em JSON.

## Métricas para relatório

`GET /metrics/summary` (sem autenticação neste projeto — proteger em produção):

- **http**: contagem de pedidos, 5xx, latência aproximada p50/p95 (amostras em memória).
- **refill_queue_bullmq**: waiting, active, delayed, failed, completed.
- **pool_redis**: soma de `LLEN` em chaves `POOL_KEY_PREFIX*` (amostra limitada).
- **ai_dlq**: profundidade da lista DLQ.

## Variáveis

Ver `.env.example` na raiz e `docker-compose.yml` (serviços `engine` e `ai-worker`).
