function required(name: string): string {
    const v = process.env[name];
    if (!v) {
        throw new Error(`${name} is not set`);
    }
    return v;
}

export const env = {
    REDIS_QUEUE_URL: required("REDIS_QUEUE_URL"),
    POOL_KEY_PREFIX: process.env.POOL_KEY_PREFIX ?? "pool:ad:",
    REFILL_STREAM_KEY: process.env.REFILL_STREAM_KEY ?? "stream:refill_jobs",
    POOL_MIN: Number(process.env.POOL_MIN ?? 3),
    POOL_TARGET: Number(process.env.POOL_TARGET ?? 10),

    REDIS_POOL_CIRCUIT_TIMEOUT_MS: Number(
        process.env.REDIS_POOL_CIRCUIT_TIMEOUT_MS ?? 3000,
    ),
    REDIS_POOL_CIRCUIT_RESET_MS: Number(
        process.env.REDIS_POOL_CIRCUIT_RESET_MS ?? 30000,
    ),
    REDIS_POOL_CIRCUIT_ERROR_THRESHOLD_PERCENTAGE: Number(
        process.env.REDIS_POOL_CIRCUIT_ERROR_THRESHOLD_PERCENTAGE ?? 50,
    ),
    REDIS_POOL_CIRCUIT_VOLUME_THRESHOLD: Number(
        process.env.REDIS_POOL_CIRCUIT_VOLUME_THRESHOLD ?? 5,
    ),

    /** Rate limit por IP (cliente) — janela fixa no Redis. */
    RATE_LIMIT_ENABLED:
        (process.env.RATE_LIMIT_ENABLED ?? "true").toLowerCase() === "true",
    RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX ?? 120),
    RATE_LIMIT_WINDOW_SEC: Number(process.env.RATE_LIMIT_WINDOW_SEC ?? 60),

    /** Atrás de proxy (nginx, ingress): necessário para `req.ip` / X-Forwarded-For corretos. */
    TRUST_PROXY: (process.env.TRUST_PROXY ?? "false").toLowerCase() === "true",

    /** BullMQ — fila entre Engine e o Redis Stream do ai-worker. */
    REFILL_BULLMQ_QUEUE_NAME:
        process.env.REFILL_BULLMQ_QUEUE_NAME ?? "refill-to-stream",
    BULLMQ_PREFIX: process.env.BULLMQ_PREFIX ?? "bull",
    REFILL_WORKER_CONCURRENCY: Number(
        process.env.REFILL_WORKER_CONCURRENCY ?? 8,
    ),
    REFILL_QUEUE_ATTEMPTS: Number(process.env.REFILL_QUEUE_ATTEMPTS ?? 3),
    REFILL_QUEUE_BACKOFF_MS: Number(
        process.env.REFILL_QUEUE_BACKOFF_MS ?? 1500,
    ),

    /** Descarte de carga: protege a Engine em picos (503 + Retry-After). */
    LOAD_SHED_ENABLED:
        (process.env.LOAD_SHED_ENABLED ?? "true").toLowerCase() === "true",
    /** Máximo de jobs refill em espera na BullMQ antes de começar a devolver 503. */
    LOAD_SHED_MAX_WAITING: Number(process.env.LOAD_SHED_MAX_WAITING ?? 500),
    /**
     * Limite global de requisições HTTP simultâneas (slots no Redis). 0 = desliga o mecanismo.
     */
    LOAD_SHED_CONCURRENT_MAX: Number(
        process.env.LOAD_SHED_CONCURRENT_MAX ?? 0,
    ),
    LOAD_SHED_SLOT_TTL_SEC: Number(process.env.LOAD_SHED_SLOT_TTL_SEC ?? 120),

    /** Lista Redis onde o ai-worker empurha falhas permanentes (DLQ). */
    AI_DLQ_LIST_KEY: process.env.AI_DLQ_LIST_KEY ?? "dlq:ai:refill",
};
