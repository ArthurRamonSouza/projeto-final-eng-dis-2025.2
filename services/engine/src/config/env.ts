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
};
