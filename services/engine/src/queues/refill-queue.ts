import { Queue, Worker, type Job } from "bullmq";
import Redis from "ioredis";
import { env } from "../config/env.js";
import { redis } from "../lib/redis.js";

export type RefillJobPayload = {
    jobId: string;
    adId: string;
    requestedCount: number;
    reason: string;
};

/**
 * Conexão dedicada BullMQ (maxRetriesPerRequest: null é obrigatório para workers).
 */
function createConnection(): Redis {
    return new Redis(env.REDIS_QUEUE_URL, {
        maxRetriesPerRequest: null,
        connectTimeout: 10_000,
    });
}

const bullConnection = createConnection();

let refillQueue: Queue<RefillJobPayload> | null = null;
let refillWorker: Worker<RefillJobPayload> | null = null;

export function getRefillQueue(): Queue<RefillJobPayload> {
    if (!refillQueue) {
        refillQueue = new Queue<RefillJobPayload>(
            env.REFILL_BULLMQ_QUEUE_NAME,
            {
                connection: bullConnection.duplicate(),
                prefix: env.BULLMQ_PREFIX,
            },
        );
    }
    return refillQueue;
}

/**
 * Enfileira refill para o worker BullMQ publicar no Redis Stream consumido pelo ai-worker (Python).
 */
export async function enqueueRefillJob(
    payload: RefillJobPayload,
): Promise<void> {
    await getRefillQueue().add("publish-to-stream", payload, {
        jobId: payload.jobId,
        attempts: env.REFILL_QUEUE_ATTEMPTS,
        backoff: { type: "exponential", delay: env.REFILL_QUEUE_BACKOFF_MS },
        removeOnComplete: { count: 2000 },
        removeOnFail: false,
    });
}

export function startRefillWorker(): Worker<RefillJobPayload> {
    if (refillWorker) {
        return refillWorker;
    }

    refillWorker = new Worker<RefillJobPayload>(
        env.REFILL_BULLMQ_QUEUE_NAME,
        async (job: Job<RefillJobPayload>) => {
            const { jobId, adId, requestedCount, reason } = job.data;
            await redis.xadd(
                env.REFILL_STREAM_KEY,
                "*",
                "job_id",
                jobId,
                "ad_id",
                adId,
                "requested_count",
                String(requestedCount),
                "reason",
                reason,
            );
        },
        {
            connection: bullConnection.duplicate(),
            prefix: env.BULLMQ_PREFIX,
            concurrency: env.REFILL_WORKER_CONCURRENCY,
        },
    );

    refillWorker.on("failed", (job, err) => {
        console.error(
            "[refill-worker] job falhou (vai para failed/DLQ BullMQ)",
            job?.id,
            err,
        );
    });

    return refillWorker;
}

export async function getRefillQueueCounts(): Promise<{
    waiting: number;
    active: number;
    delayed: number;
    failed: number;
    completed: number;
}> {
    const q = getRefillQueue();
    const c = await q.getJobCounts(
        "waiting",
        "active",
        "delayed",
        "failed",
        "completed",
    );
    return {
        waiting: c.waiting ?? 0,
        active: c.active ?? 0,
        delayed: c.delayed ?? 0,
        failed: c.failed ?? 0,
        completed: c.completed ?? 0,
    };
}

export async function closeRefillInfrastructure(): Promise<void> {
    await refillWorker?.close();
    await refillQueue?.close();
    await bullConnection.quit();
}
