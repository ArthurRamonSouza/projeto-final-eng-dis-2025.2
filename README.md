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

1. **Variáveis de ambiente (obrigatório):**
   - Raiz do projeto (usado pelo Docker Compose): `Copy-Item .env.example .env` (PowerShell).
   - Serviços para execução isolada:
     - `Copy-Item services/engine/.env.example services/engine/.env`
     - `Copy-Item services/ai-worker/.env.example services/ai-worker/.env`
     - `Copy-Item services/shared/.env.example services/shared/.env`
   - No arquivo `.env` da raiz, preencha **`GEMINI_API_KEY`** com uma chave válida para habilitar a geração de desafios por IA.
2. **Subir a stack:** na raiz do repositório, `docker compose up --build`.
3. **Engine** (API TypeScript/Node): `http://localhost:8000/health` (porta em `ENGINE_PORT` no `.env`).
4. **Painel** (React/Vite): ver secção [Painel web no Docker](#painel-web-no-docker) abaixo.
5. **PostgreSQL** (dados), **Redis** (fila), **ai-worker** (Python), **engine** e **panel** estão definidos em `docker-compose.yml`.

Variáveis principais: `DATABASE_URL`, `REDIS_QUEUE_URL` e `GEMINI_API_KEY`. Veja `.env.example`.

> Sem `GEMINI_API_KEY`, os serviços sobem normalmente com `docker compose up --build`, mas funcionalidades de geração de desafios com IA no `ai-worker` não funcionarão.

Validação sem subir containers: `docker compose config` e `docker compose build`.

### Painel web no Docker

O Compose inclui o serviço **`panel`**, que sobe o front-end em **`POC4-panel/`** sem precisares de instalar Node na máquina host para desenvolvimento.

| Aspeto | Detalhe |
|--------|---------|
| **O que corre no container** | `npm ci` (instala dependências a partir do `package-lock.json`) e, em seguida, `npm run dev` com o Vite a escutar em `0.0.0.0:5173`. |
| **Código fonte** | A pasta `POC4-panel/` é montada em `/app`; o volume anónimo `poc4_panel_node_modules` guarda o `node_modules` dentro do container (evita conflitos com o teu SO). |
| **URL no browser** | `http://localhost:5173` (ou a porta definida em **`PANEL_PORT`** no `.env` da raiz). |
| **Chamadas à API** | O Vite injeta **`VITE_API_BASE_URL`** no bundle. Esse URL é o que o **browser** usa para falar com a Engine na **tua máquina** (host), não o hostname interno do Docker. **Tem de coincidir com a porta em que a Engine está exposta no host.** Exemplo: se `ENGINE_PORT=8010`, define `VITE_API_BASE_URL=http://localhost:8010`. Se omitires, o default no Compose é `http://localhost:8000`. |
| **Primeira subida** | O `npm ci` pode demorar; as seguintes são mais rápidas enquanto o volume de `node_modules` existir. |

**Subir só o backend (sem o painel):** por exemplo  
`docker compose up --build postgres redis engine ai-worker`

**Desenvolvimento do painel fora do Docker:** na pasta `POC4-panel/`, com Node 20+, `npm install` e `npm run dev` (comportamento equivalente, mas dependências no host).

### Desenvolvimento local

* **Engine:** `cd services/engine`, `corepack enable` (uma vez), `pnpm install`, `pnpm run dev` (usa `services/engine/.env`).
* **Shared:** `cd services/shared`, `pnpm install`, `pnpm run check` (não requer variáveis de ambiente no momento).
* **ai-worker:** `cd services/ai-worker`, `python -m venv .venv`, `.\.venv\Scripts\Activate.ps1`, `pip install -r requirements-dev.txt` (usa `services/ai-worker/.env`).

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
