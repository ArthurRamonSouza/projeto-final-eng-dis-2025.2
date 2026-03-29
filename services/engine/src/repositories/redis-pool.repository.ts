import { redis, poolKey } from "../lib/redis.js";

export const redisPoolRepository = {
    async popChallenge(adId: string): Promise<string | null> {
        const key = poolKey(adId);
        const raw = await redis.rpop(key);
        return raw;
    },

    async size(adId: string): Promise<number> {
        const key = poolKey(adId);
        return redis.llen(key);
    },
};
