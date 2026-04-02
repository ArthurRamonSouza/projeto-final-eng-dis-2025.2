# Base de conhecimento e roteiro do vídeo final

Este documento é a fonte principal para gravar o vídeo final (15 a 30 minutos), cobrindo:
- contexto do problema,
- arquitetura e decisões,
- demonstração funcional,
- resultados de testes,
- lições aprendidas.

Os ADRs continuam sendo a referência formal de decisão: `docs/adrs/`.

---

## 1) Contexto do problema

**Problema:** geração de desafios com IA tem latência alta e imprevisível.  
Se a API esperar a IA no request síncrono, o usuário sofre com timeout e lentidão.

**Objetivo da POC 4 (IA como Pool):**
- manter resposta rápida ao usuário final;
- desacoplar geração pesada da API;
- garantir resiliência com fallback e proteção sob carga.

**Ideia-chave:**  
“O sistema prioriza disponibilidade e baixa latência para consumo de desafios, mesmo quando a IA ou a fila degradam.”

---

## 2) Arquitetura da solução (visão geral)

### Componentes

- **engine** (`Node.js/Express`): API principal; atende rotas de anúncios, consumo de desafio, saúde e métricas.
- **ai-worker** (`Python/FastAPI`): processa jobs assíncronos, chama Gemini, salva desafios no Redis e fallback estático.
- **Redis**: pool de desafios quentes, streams de refill e estruturas auxiliares (rate-limit, controle de carga, DLQ).
- **PostgreSQL**: persistência de anúncios, jobs, resultados e desafios estáticos.

### Fluxo principal

1. Cliente chama `GET /ads/:adId/challenge` na engine.  
2. Engine tenta consumir do pool Redis (`POOL_KEY_PREFIX`).  
3. Se pool vazio/inválido, usa fallback estático no PostgreSQL.  
4. Se pool abaixo do mínimo, engine dispara refill assíncrono (BullMQ -> stream -> ai-worker).  
5. ai-worker gera novos desafios com Gemini e reabastece o pool.

---

## 3) Decisões técnicas aplicadas

### 3.1 Desacoplamento assíncrono (ADR 01)

- A geração não bloqueia o request HTTP.
- Pipeline de fila híbrida:
  - Engine enfileira em **BullMQ** (`REFILL_BULLMQ_QUEUE_NAME`);
  - Worker BullMQ publica no stream Redis (`REFILL_STREAM_KEY`);
  - ai-worker consome stream e gera desafios.

**Benefício no vídeo:** demonstrar que a API continua respondendo mesmo com IA lenta.

### 3.2 Fallback + bulkhead + circuit breaker (ADR 02)

- **Fallback:** quando Redis/pool não entrega, engine busca estático no PostgreSQL.
- **Bulkhead:** `engine` e `ai-worker` em containers separados.
- **Isolamento de infra:** redes separadas (`postgres_net`, `redis_net`) e limites de recursos por serviço.
- **Circuit breakers:**
  - `pybreaker` no ai-worker (chamada LLM),
  - `opossum` na engine (operações críticas de pool Redis).

### 3.3 Load shedding (ADR 03)

- Proteção por sobrecarga:
  - middleware na engine com 503 + `Retry-After` quando backlog/concorrência ultrapassam limite,
  - e estratégia por saúde do ai-worker com cache.
- Rotas de leitura são priorizadas; geração nova pode ser reduzida/bloqueada.

### 3.4 Retry, DLQ e resiliência de fila

- **Retry com backoff exponencial no ai-worker** (Tenacity) para falhas transitórias.
- **Retry/Bacoff na BullMQ** para jobs de refill (`attempts`, `backoff`).
- **DLQ no ai-worker** (`AI_DLQ_LIST_KEY`) para falhas permanentes de processamento.

### 3.5 Segurança e controle de tráfego

- **Rate limit por IP** na engine (Redis + Lua), com exceção para `/health`.
- Segredos via `.env` (não versionados), incluindo `GEMINI_API_KEY`.

---

## 4) Principais variáveis de ambiente (explicar no vídeo)

### Núcleo
- `DATABASE_URL`
- `REDIS_QUEUE_URL`
- `GEMINI_API_KEY`

### Pool/fila
- `POOL_KEY_PREFIX`
- `REFILL_BULLMQ_QUEUE_NAME`
- `REFILL_STREAM_KEY`
- `AI_DLQ_LIST_KEY`

### Retry/backoff
- `AI_MAX_RETRIES`
- `AI_RETRY_MIN_SEC`
- `AI_RETRY_MAX_SEC`
- `AI_RETRY_BACKOFF_MULTIPLIER`
- `REFILL_QUEUE_ATTEMPTS`
- `REFILL_QUEUE_BACKOFF_MS`

### Proteção de carga
- `RATE_LIMIT_ENABLED`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_SEC`
- `LOAD_SHED_ENABLED`, `LOAD_SHED_MAX_WAITING`, `LOAD_SHED_CONCURRENT_MAX`
- `LOAD_SHEDDING_ENABLED`, `AI_WORKER_BASE_URL`, `LOAD_SHEDDING_CACHE_MS`

---

## 5) Roteiro sugerido para gravação (15 a 30 min)

## Bloco A — Problema e objetivo (2 a 4 min)
- Apresentar contexto do desafio.
- Explicar por que síncrono não escala para IA.

## Bloco B — Arquitetura e decisões (5 a 8 min)
- Mostrar C4/fluxo entre engine, Redis, ai-worker e Postgres.
- Explicar ADR 01, 02 e 03 com foco em trade-offs.

## Bloco C — Demo funcional (6 a 12 min)
- Subir stack com `docker compose up --build`.
- Criar anúncio (`POST /ads`).
- Consumir desafio (`GET /ads/:adId/challenge`).
- Mostrar refill (`POST /ads/:adId/refill` ou automático).
- Mostrar health/dependencies/metrics (`/health`, `/health/dependencies`, `/metrics/summary`).
- Mostrar evidência de retry/DLQ em cenário de falha.

## Bloco D — Resiliência e testes (3 a 6 min)
- Citar cenários executados: carga, queda de IA, queda de Redis, pool vazio.
- Apresentar evidências (logs, respostas HTTP, métricas).

## Bloco E — Lições aprendidas e próximos passos (2 a 4 min)
- O que funcionou bem.
- O que foi simplificado.
- Melhorias futuras.

---

## 6) Checklist de demonstração (para não esquecer no vídeo)

- [ ] Stack sobe sem erro (`docker compose up --build`)
- [ ] `GET /health` e `GET /health/dependencies` respondem
- [ ] Criação de anúncio funciona
- [ ] Consumo de desafio funciona (pool/fallback)
- [ ] Refill aparece na fila/stream
- [ ] Retry + DLQ demonstrados ou explicados com evidência
- [ ] Load shedding/rate-limit demonstrados em condição de carga
- [ ] Métricas finais mostradas

---

## 7) Limitações conhecidas (falar de forma transparente)

- Arquitetura híbrida (BullMQ + stream + worker Python) aumenta complexidade operacional.
- Duas famílias de variáveis de load shedding coexistem (`LOAD_SHED_*` e `LOAD_SHEDDING_*`), exigindo cuidado de configuração.
- Qualidade do fallback estático depende de curadoria.

---

## 8) Referências rápidas

- [ADR 01](adrs/01-desacoplamento-fila-worker-assincrono.md): desacoplamento assíncrono e fila.
- [ADR 02](adrs/02-estrategia-fallback-isolamento-bulkhead.md): fallback, bulkhead e circuit breaker.
- [ADR 03](adrs/03-protecao-sobrecarga-load-shedding.md): proteção sob sobrecarga.
- `README.md`: execução local e CI.

---

*Última atualização: 2026-04-02.*
