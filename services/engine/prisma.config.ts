import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl =
    process.env.DATABASE_URL ?? "postgresql://app:app@localhost:5432/app";

export default defineConfig({
    schema: "db/prisma/schema.prisma",
    migrations: {
        path: "db/prisma/migrations",
    },
    datasource: {
        url: databaseUrl,
    },
});
