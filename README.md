# ENGENHARIA DE SISTEMAS DISTRIBUÍDOS – 2025.2

## Projeto Final

### Equipe

* Ana Clara Santos D'Andrea (83 98847-6121, ana.dandrea@academico.ufpb.br)
* Arthur Ramon Souza (83 98217-1881, arthuramon.souza93@hotmail.com)
* Davi Baratto (83 99113-0125, davibto1427@gmail.com)
* Eduardo Alves Braz de Medeiros (83 9893-9463)
* Pedro Luccas de Brito Brock (81 98221-9101, pedrosbrock@gmail.com)
* Pedro Targino Gomes (83 9164-3401)

### Tema escolhido

POC 4 — IA como Pool (Não Dependência Síncrona)

## Ambiente local (Docker)

1. **Variáveis de ambiente (opcional):** `Copy-Item .env.example .env` (PowerShell) ou copie manualmente.
2. **Subir a stack:** na raiz do repositório, `docker compose up --build`.
3. **Engine** (API TypeScript/Node): `http://localhost:8000/health` (porta em `ENGINE_PORT` no `.env`).
4. **PostgreSQL** (dados), **Redis** (fila), **ai-worker** (Python) e **engine** estão definidos em `docker-compose.yml`.

Variáveis principais: `DATABASE_URL` e `REDIS_QUEUE_URL`. Veja `.env.example`.

Validação sem subir containers: `docker compose config` e `docker compose build`.

### Desenvolvimento local

* **Engine:** `cd services/engine`, `corepack enable` (uma vez), `pnpm install`, `pnpm run dev`.
* **Shared:** `cd services/shared`, `pnpm install`, `pnpm run check`.

### Padrão de código (lint e formatação)

| Serviço | Ferramentas | Comandos |
|--------|-------------|----------|
| `services/engine` | ESLint + Prettier | `pnpm run lint`, `pnpm run format`, `pnpm run format:check`, `pnpm run check` |
| `services/shared` | ESLint + Prettier | os mesmos, na pasta `services/shared` |
| `services/ai-worker` | [Ruff](https://docs.astral.sh/ruff/) | `pip install -r requirements-dev.txt`, `ruff check .`, `ruff format --check .` (ou `ruff format .`) |

### CI no GitHub

O workflow em `.github/workflows/ci.yml` roda em **push**, **pull_request** e pode ser disparado manualmente (**Actions → CI → Run workflow**). Inclui lint, verificação de formatação, build e Docker Compose.

Para validar **antes** do `git commit`, use hooks locais (ex.: Husky + lint-staged).

## Banco de dados

* Schema Prisma: **`services/engine/db/prisma/`** (Postgres partilhado com o ai-worker). Migrações: `cd services/engine`, `pnpm db:migrate`. Ver `services/engine/db/README.md`.

## Documentação

* ADRs: pasta `docs/adrs/`.
