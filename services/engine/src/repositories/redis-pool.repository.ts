import {
    popChallengeWithCircuit,
    poolSizeWithCircuit,
} from "../lib/redis-pool-circuit.js";

export const redisPoolRepository = {
    async popChallenge(adId: string): Promise<string | null> {
        return popChallengeWithCircuit(adId);
    },

    async size(adId: string): Promise<number> {
        return poolSizeWithCircuit(adId);
    },
};
