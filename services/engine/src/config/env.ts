function required(name: string): string {
    const v = process.env[name];
    if (!v) {
        throw new Error(`${name} is not set`);
    }
    return v;
}

export const env = {
    REDIS_QUEUE_URL: required("REDIS_QUEUE_URL"),
    POOL_MIN: Number(process.env.POOL_MIN ?? 3),
    POOL_TARGET: Number(process.env.POOL_TARGET ?? 10),

    REDIS_POOL_CIRCUIT_TIMEOUT_MS: Number(process.env.REDIS_POOL_CIRCUIT_TIMEOUT_MS ?? 3000),
    REDIS_POOL_CIRCUIT_RESET_MS: Number(process.env.REDIS_POOL_CIRCUIT_RESET_MS ?? 30000),
    REDIS_POOL_CIRCUIT_ERROR_THRESHOLD_PERCENTAGE: Number(
        process.env.REDIS_POOL_CIRCUIT_ERROR_THRESHOLD_PERCENTAGE ?? 50,
    ),
    REDIS_POOL_CIRCUIT_VOLUME_THRESHOLD: Number(process.env.REDIS_POOL_CIRCUIT_VOLUME_THRESHOLD ?? 5),

    /** Rate limit por IP (cliente) — janela fixa no Redis. */
    RATE_LIMIT_ENABLED: (process.env.RATE_LIMIT_ENABLED ?? "true").toLowerCase() === "true",
    RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX ?? 120),
    RATE_LIMIT_WINDOW_SEC: Number(process.env.RATE_LIMIT_WINDOW_SEC ?? 60),

    /** Atrás de proxy (nginx, ingress): necessário para `req.ip` / X-Forwarded-For corretos. */
    TRUST_PROXY: (process.env.TRUST_PROXY ?? "false").toLowerCase() === "true",
};
