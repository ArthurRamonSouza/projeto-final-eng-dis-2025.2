# ADR 03: Proteção de sobrecarga via load shedding

| Campo | Valor |
|--------|--------|
| **Status** | Aceito |
| **Data** | 2026-03-20 (atualizado 2026-04-01) |
| **Padrão** | Load shedding / priorização sob pressão |

## Contexto

Em **picos de tráfego**, o processamento pesado (ex.: geração via IA no worker) pode consumir **CPU, memória e filas** de forma agressiva, prejudicando quem está apenas a **consumir desafios** do pool ou fluxos mais leves. Sem limitação, um subsistema pode **afetar todo o sistema**.

## Decisão

Implementar **load shedding** na **engine** (Node.js):

1. A engine consulta o **`GET /health` do `ai-worker`** com **cache em memória**:
   - TTL do cache: **`LOAD_SHEDDING_CACHE_MS`** (padrão: `2000ms`);
   - Timeout por chamada de health: **`LOAD_SHEDDING_HEALTH_TIMEOUT_MS`** (padrão: `800ms`);
   - Dentro do TTL, a engine reutiliza a última decisão (`shedding=true/false`) e evita chamar o worker em toda requisição.
2. Se o worker estiver **degradado** — health inacessível, resposta não OK, **Redis do worker em baixo**, ou **circuit breaker aberto** (pybreaker) — a engine **deixa de enfileirar novo trabalho de geração** (nada de `XADD` no stream de refill).
3. **Rotas de leitura** (ex.: `GET .../challenge`, pool status, listagens) **continuam**, servindo o que já existe no Redis/PostgreSQL (incluindo fallback estático).
4. **`POST .../refill` manual** responde **503** com código `LOAD_SHEDDING` quando o shedding está ativo.
5. Ativação por variável **`LOAD_SHEDDING_ENABLED=true`**; URL do worker em **`AI_WORKER_BASE_URL`** (ex.: `http://ai-worker:8001` no Docker).

Comportamento detalhado no código: `services/engine/src/services/load-shedding.service.ts` e usos em `refill.service.ts`, `refill-api.service.ts`, `ads.service.ts`.

## Consequências

### Benefícios

- **Estabilidade** da API sob stress: menos pressão na fila quando o worker já não acompanha.
- Proteção dos caminhos de **leitura** frente ao custo de **novas gerações**.

### Trade-offs

- Em picos, **refill automático** e **criação de anúncio com job inicial** podem **não enfileirar** geração até o worker recuperar; o utilizador de refill manual recebe **503**.
- Requer **`AI_WORKER_BASE_URL` correto** na rede (Compose: nome do serviço + porta).

## Referências

- Load shedding e *backpressure* em APIs.
- Implementação: `services/engine/src/services/load-shedding.service.ts`.
