# Banco de dados (PostgreSQL)

- **`db/prisma/schema.prisma`** — modelo das tabelas (sem `url`: ligação em **`prisma.config.ts`** + `DATABASE_URL`).
- **Prisma ORM 7:** o cliente é gerado em **`node_modules/.prisma/client`** (via `@prisma/client`, `provider = "prisma-client-js"`). Em runtime usa-se **`PrismaClient` + `@prisma/adapter-pg`** (ver `src/lib/prisma.ts`).
- Migrações: na pasta **`services/engine`**, com `DATABASE_URL` definido, `pnpm db:migrate`.
- **ai-worker (Python)** usa o mesmo `DATABASE_URL` com ORM/SQL próprio.
