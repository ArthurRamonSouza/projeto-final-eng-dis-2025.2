process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";
process.env.REDIS_QUEUE_URL ??= "redis://127.0.0.1:6379/0";
process.env.RATE_LIMIT_ENABLED ??= "false";
process.env.LOAD_SHEDDING_ENABLED ??= "false";
