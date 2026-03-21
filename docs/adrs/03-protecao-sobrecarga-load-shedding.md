# ADR 03: Proteção de sobrecarga via load shedding

| Campo | Valor |
|--------|--------|
| **Status** | Proposto |
| **Data** | 2026-03-20 |
| **Padrão** | Load shedding / priorização sob pressão |

## Contexto

Em **picos de tráfego**, o processamento de **vídeos** (ou outras tarefas pesadas) pela IA pode consumir **CPU e memória** de forma agressiva, prejudicando quem está apenas **respondendo desafios** ou usando fluxos mais leves. Sem limitação, um subsistema pode **afetar todo o sistema**.

## Decisão

Implementar **load shedding** (descarte de carga): se a **latência** do `ai-worker` (ou métrica equivalente de saúde) **ultrapassar um limite crítico**, a API passa a responder **HTTP 503 (Service Unavailable)** para **novas solicitações de geração**, enquanto **prioriza** a entrega de desafios **já existentes** no *pool* (e fluxos que não ampliam a pressão sobre a IA).

## Consequências

### Benefícios

- **Estabilidade global** do sistema de recompensas e da API sob stress.
- Proteção explícita dos caminhos críticos de leitura/uso frente ao custo de novas gerações.

### Trade-offs

- Em momentos de pico, **alguns anunciantes** (ou atores que solicitam geração) **não conseguirão** processar novos vídeos até a recuperação — experiência degradada para esse subconjunto.
- Exige **thresholds**, **métricas** e possivelmente **filas de retry** ou comunicação clara de indisponibilidade temporária.

## Referências

- Load shedding em sistemas distribuídos e APIs (priorização e *backpressure*).
