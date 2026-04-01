# tests/

Pasta de testes externos ao serviço principal. Contém testes de integração end-to-end e testes de carga, executados contra a stack completa via Docker Compose.

## Estrutura

```
tests/
├── integration/
│   └── ads-flow.test.ts        # Testes de integração E2E do fluxo de anúncios
├── resilience/
│   └── scenarios.test.ts       # Cenários de resiliência (Redis down, worker offline, etc.)
├── load-test.js                # Teste de carga padrão (k6)
└── load-test-pool-empty.js     # Teste de carga com pool Redis esvaziado (k6)
```

## Pré-requisitos

- [Docker](https://www.docker.com/) com a stack rodando: `docker compose up -d`
- [k6](https://k6.io/) instalado localmente **ou** via Docker (ver exemplos abaixo)
- Para os testes de integração/resiliência: Node.js + dependências do workspace raiz

## Testes de Integração e Resiliência

Os testes em `integration/` e `resilience/` usam **Vitest** e são executados a partir do pacote `services/engine`.

```bash
# Testes de integração E2E
npm run test:integration --prefix services/engine

# Testes de cenários de resiliência
npm run test:resilience --prefix services/engine
```

> Os testes aguardam a API estar disponível em `http://localhost:8000` antes de iniciar. Certifique-se de que `docker compose up -d` foi executado.

### Variáveis de ambiente

| Variável          | Padrão                  | Descrição                         |
| ----------------- | ----------------------- | --------------------------------- |
| `API_BASE_URL`    | `http://localhost:8000` | URL base da engine                |
| `AI_WORKER_URL`   | `http://localhost:8001` | URL do worker de IA               |
| `COMPOSE_PROJECT` | `projeto-final-eng-dis` | Prefixo do projeto Docker Compose |

## Testes de Carga (k6)

### `load-test.js` — Carga padrão

Simula usuários buscando anúncios e resolvendo desafios com o pool Redis ativo.

**Estágios:**

- 0 → 50 VUs em 30s
- 50 → 100 VUs por 1min
- 100 → 0 VUs em 30s

**Thresholds:**

- `p(95)` de latência HTTP < 50ms
- `p(95)` de listagem de anúncios < 200ms
- `p(95)` de challenge < 50ms
- Taxa de erros HTTP < 1%

```bash
# Usando k6 local
k6 run tests/load-test.js

# Usando Docker (sem instalar k6)
docker run --rm -i --network host grafana/k6 run - < tests/load-test.js

# Com URL customizada
k6 run -e BASE_URL=http://localhost:8000 tests/load-test.js
```

### `load-test-pool-empty.js` — Carga com pool vazio

Valida que o sistema mantém disponibilidade via **fallback estático (PostgreSQL)** quando o pool Redis está vazio.

**Pré-requisito:** esvaziar o pool Redis antes de executar:

```bash
# Opção 1: flush total do banco Redis
docker exec projeto-final-eng-dis-redis-1 redis-cli FLUSHDB

# Opção 2: apenas as chaves de pool
docker exec projeto-final-eng-dis-redis-1 redis-cli --scan --pattern "pool:ad:*" \
  | xargs docker exec -i projeto-final-eng-dis-redis-1 redis-cli DEL
```

**Thresholds:**

- Taxa de erros HTTP < 1%
- `p(95)` de latência de challenge com pool vazio < 200ms
- Fallback ativado em > 50% das requisições

```bash
k6 run tests/load-test-pool-empty.js

# Usando Docker
docker run --rm -i --network host grafana/k6 run - < tests/load-test-pool-empty.js
```
