# Contexto de build: ./services/engine (ver docker-compose.yml).
FROM node:22-alpine AS build

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY prisma.config.ts ./
COPY db/prisma ./db/prisma
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN pnpm run build

FROM node:22-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/dist ./dist

EXPOSE 8000
CMD ["node", "dist/server.js"]
