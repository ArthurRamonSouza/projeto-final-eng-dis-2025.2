# ADR 01: Desacoplamento via fila e worker assíncrono

| Campo | Valor |
|--------|--------|
| **Status** | Aceito |
| **Data** | 2026-03-20 (atualizado 2026-04-02) |
| **Padrão** | SYNC vs ASYNC / filas (escalabilidade) |

## Contexto

A latência da integração com IA (ex.: Gemini) é **alta e imprevisível**. Um fluxo **síncrono** na API exporia o cliente a esperas longas e a risco de **timeout**, degradando a experiência e a confiabilidade do canal HTTP.

## Decisão

Utilizar **Redis** como backend de **fila e pool**, com pipeline híbrido:

- a **engine** (Node.js) publica jobs de refill na **BullMQ**;
- um worker BullMQ na engine repassa o job para o **Redis Stream** (`REFILL_STREAM_KEY`);
- o **ai-worker** (Python) consome o stream, chama o LLM e publica desafios no pool (`POOL_KEY_PREFIX`).

Assim, a API HTTP não bloqueia em chamada de IA: o caminho crítico do cliente permanece desacoplado do processamento pesado.

## Consequências

### Benefícios

- Latência percebida pelo usuário final pode permanecer **baixa** (meta: **&lt; 50 ms** para operações que não dependem do término da geração), com trabalho pesado deslocado para workers.
- Escalabilidade horizontal do processamento de IA de forma independente da API.
- Controle de fila no lado Node com recursos da BullMQ (tentativas, backoff, backlog, métricas).

### Trade-offs

- Introduz **consistência eventual**: o *pool* de desafios pode **demorar a encher** após picos de demanda ou cold start.
- Arquitetura híbrida (BullMQ + Redis Stream + worker Python) aumenta a complexidade operacional.
- Exige manter consistência de configuração entre engine e ai-worker (chaves, streams e política de retries).

## Referências

- BullMQ (`services/engine/src/queues/refill-queue.ts`).
- Redis Streams e listas (refill/pool).
- Documentação do projeto: `README.md`, `services/ai-worker` (retry, DLQ) e `services/engine` (fila/refill).
