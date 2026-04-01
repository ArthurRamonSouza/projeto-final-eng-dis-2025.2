import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["../../tests/resilience/**/*.test.ts"],
        testTimeout: 60_000,
        hookTimeout: 60_000,
        setupFiles: [],
        sequence: { shuffle: false },
        pool: "forks",
        poolOptions: {
            forks: { singleFork: true },
        },
    },
});
