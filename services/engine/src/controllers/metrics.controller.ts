import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { redis } from "../lib/redis.js";
import { getHttpMetricsSnapshot } from "../middleware/http-metrics.js";
import { getRefillQueueCounts } from "../queues/refill-queue.js";

const POOL_SCAN_CAP = 500;

async function samplePoolTotals(): Promise<{
    total_challenges_in_pools: number;
    pool_keys_sampled: number;
}> {
    let cursor = "0";
    let total = 0;
    let keys = 0;
    const prefix = env.POOL_KEY_PREFIX;
    do {
        const [next, batch] = await redis.scan(
            cursor,
            "MATCH",
            `${prefix}*`,
            "COUNT",
            100,
        );
        cursor = next;
        for (const key of batch) {
            total += await redis.llen(key);
            keys += 1;
            if (keys >= POOL_SCAN_CAP) {
                return {
                    total_challenges_in_pools: total,
                    pool_keys_sampled: keys,
                };
            }
        }
    } while (cursor !== "0");
    return { total_challenges_in_pools: total, pool_keys_sampled: keys };
}

export const metricsController = {
    /**
     * Métricas para monitorização do pool, filas, latência e DLQ (Critério 4).
     */
    async summary(_req: Request, res: Response): Promise<void> {
        const http = getHttpMetricsSnapshot();
        const queue = await getRefillQueueCounts();
        let pool = {
            total_challenges_in_pools: 0,
            pool_keys_sampled: 0,
        };
        let dlqDepth = 0;
        try {
            pool = await samplePoolTotals();
            dlqDepth = await redis.llen(env.AI_DLQ_LIST_KEY);
        } catch {
            /* Redis parcial */
        }

        res.json({
            service: "engine",
            http,
            refill_queue_bullmq: queue,
            pool_redis: pool,
            ai_dlq: {
                redis_list_key: env.AI_DLQ_LIST_KEY,
                depth: dlqDepth,
            },
            load_shed: {
                enabled: env.LOAD_SHED_ENABLED,
                max_waiting_jobs: env.LOAD_SHED_MAX_WAITING,
                concurrent_slots_max: env.LOAD_SHED_CONCURRENT_MAX,
            },
        });
    },
};
