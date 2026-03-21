# ADR 01: Desacoplamento via fila e worker assíncrono

| Campo | Valor |
|--------|--------|
| **Status** | Proposto |
| **Data** | 2026-03-20 |
| **Padrão** | SYNC vs ASYNC / filas (escalabilidade) |

## Contexto

A latência da integração com IA (ex.: OpenAI) é **alta e imprevisível**. Um fluxo **síncrono** na API exporia o cliente a esperas longas e a risco de **timeout**, degradando a experiência e a confiabilidade do canal HTTP.

## Decisão

Utilizar **Redis** e **BullMQ** (ecossistema **Node.js**) para gerenciar uma **fila de geração** assíncrona. O **Motor de Desafios** (API/engine) **apenas consome o que já está pronto** no Redis (resultados disponibilizados pelo fluxo assíncrono), em vez de bloquear na chamada à IA.

## Consequências

### Benefícios

- Latência percebida pelo usuário final pode permanecer **baixa** (meta: **&lt; 50 ms** para operações que não dependem do término da geração), com trabalho pesado deslocado para workers.
- Escalabilidade horizontal do processamento de IA de forma independente da API.

### Trade-offs

- Introduz **consistência eventual**: o *pool* de desafios pode **demorar a encher** após picos de demanda ou cold start.
- Operação e observabilidade de **fila** (retries, dead-letter, monitoramento) passam a ser requisitos de primeira classe.

## Referências

- [BullMQ](https://docs.bullmq.io/)
- Redis como backend de filas e estado de jobs.
