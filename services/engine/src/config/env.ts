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
};
