# ADR 02: Estratégia de fallback e isolamento (bulkhead)

| Campo | Valor |
|--------|--------|
| **Status** | Proposto |
| **Data** | 2026-03-20 |
| **Padrão** | Circuit breaker / bulkhead (confiabilidade) |

## Contexto

Se o serviço de IA **falhar** ou a **fila** ficar **congestionada**, o sistema **não pode parar** por completo: usuários ainda precisam de desafios e de uma experiência mínima aceitável.

## Decisão

1. **Circuit breaker**  
   Monitorar a **saúde** do worker de IA. Se o circuito estiver no estado **OPEN**, o sistema **passa a usar o PostgreSQL** como fonte de **desafios estáticos** (fallback), desviando tráfego da dependência degradada.

2. **Bulkhead (isolamento)**  
   Executar o **worker de IA** em **container separado** da API principal, de modo que falhas de **memória** ou picos no processamento de geração **não derrubem** o processo da API exposta ao cliente.

## Consequências

### Benefícios

- **Resiliência**: degradação controlada (estático no banco) em vez de falha total.
- **Isolamento de falhas** entre camada de entrada (API) e processamento pesado (IA).

### Trade-offs

- Manter **dois modos** de desafio (gerados vs estáticos) e regras claras de **comutação** aumenta complexidade operacional e de testes.
- Dados estáticos exigem **curadoria/atualização** e podem divergir do que a IA geraria em tempo real.

## Referências

- Padrão *Circuit Breaker* (ex.: *Release It!*, Nygard).
- Padrão *Bulkhead* para contenção de recursos.
