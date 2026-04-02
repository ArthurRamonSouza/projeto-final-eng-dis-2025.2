# ADR 02: Estratégia de fallback e isolamento (bulkhead)

| Campo | Valor |
|--------|--------|
| **Status** | Aceito |
| **Data** | 2026-03-20 (atualizado 2026-04-02) |
| **Padrão** | Circuit breaker / bulkhead (confiabilidade) |

## Contexto

Se o serviço de IA **falhar** ou a **fila** ficar **congestionada**, o sistema **não pode parar** por completo: usuários ainda precisam de desafios e de uma experiência mínima aceitável.

## Decisão

1. **Fallback + circuit breaker (degradação controlada)**  
   O fluxo de entrega de desafio prioriza o **pool Redis**; se não houver item válido, a engine usa o **fallback estático no PostgreSQL**.

   Há circuit breakers em pontos críticos:
   - **ai-worker**: `pybreaker` em torno da chamada ao LLM (protege geração).
   - **engine**: `opossum` para operações do pool Redis (`RPOP`/`LLEN`), com endpoint de observabilidade.

   Em degradação de IA, o sistema continua servindo desafios por pool/fallback em vez de falhar totalmente.

2. **Bulkhead (isolamento)**  
   Executar o **worker de IA** em **container separado** da API principal, com isolamento de infraestrutura no Compose:
   - containers independentes (`engine` e `ai-worker`);
   - redes separadas (`postgres_net` e `redis_net`);
   - limites de CPU/memória por serviço (`deploy.resources.limits`).

   Objetivo: evitar que picos/falhas do processamento de IA derrubem a API exposta ao cliente.

## Consequências

### Benefícios

- **Resiliência**: degradação controlada (estático no banco) em vez de falha total.
- **Isolamento de falhas** entre camada de entrada (API) e processamento pesado (IA).
- **Observabilidade** de estado de dependências/circuito via `/health/*`.

### Trade-offs

- Manter **dois modos** de desafio (gerados vs estáticos) e regras claras de **comutação** aumenta complexidade operacional e de testes.
- Dados estáticos exigem **curadoria/atualização** e podem divergir do que a IA geraria em tempo real.
- Mais knobs operacionais (limites de recursos, circuito, load shedding) exigem calibração e monitorização contínua.

## Referências

- Padrão *Circuit Breaker* (ex.: *Release It!*, Nygard).
- Padrão *Bulkhead* para contenção de recursos.
- Implementação no projeto:
  - `services/engine/src/services/challenge.service.ts` (fallback pool -> estático),
  - `services/engine/src/lib/redis-pool-circuit.ts` (circuit breaker Redis),
  - `services/ai-worker/src/main.py` (`pybreaker` no LLM),
  - `docker-compose.yml` (isolamento e limites).
