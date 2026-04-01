import Redis from "ioredis";
import { env } from "../config/env.js";

export const redis = new Redis(env.REDIS_QUEUE_URL, {
    maxRetriesPerRequest: 2,
});

export function poolKey(adId: string): string {
    return `${env.POOL_KEY_PREFIX}${adId}`;
}
