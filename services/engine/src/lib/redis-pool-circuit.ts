import CircuitBreaker from "opossum";
import { env } from "../config/env.js";
import { poolKey, redis } from "./redis.js";

async function redisPoolAction(
    kind: "pop" | "llen",
    adId: string,
): Promise<string | number | null> {
    const key = poolKey(adId);
    if (kind === "pop") {
        return redis.rpop(key);
    }
    return redis.llen(key);
}

const poolBreaker = new CircuitBreaker(redisPoolAction, {
    name: "redis-challenge-pool",
    timeout: env.REDIS_POOL_CIRCUIT_TIMEOUT_MS,
    resetTimeout: env.REDIS_POOL_CIRCUIT_RESET_MS,
    errorThresholdPercentage: env.REDIS_POOL_CIRCUIT_ERROR_THRESHOLD_PERCENTAGE,
    volumeThreshold: env.REDIS_POOL_CIRCUIT_VOLUME_THRESHOLD,
});

poolBreaker.on("open", () => {
    console.warn(
        "[redis-pool-circuit] circuito aberto — chamadas ao Redis do pool em curto-circuito até half-open",
    );
});

poolBreaker.on("halfOpen", () => {
    console.warn(
        "[redis-pool-circuit] circuito half-open — a testar Redis novamente",
    );
});

export async function popChallengeWithCircuit(
    adId: string,
): Promise<string | null> {
    try {
        return (await poolBreaker.fire("pop", adId)) as string | null;
    } catch {
        return null;
    }
}

export async function poolSizeWithCircuit(adId: string): Promise<number> {
    try {
        return (await poolBreaker.fire("llen", adId)) as number;
    } catch {
        return 0;
    }
}

export function getRedisPoolCircuitState(): "open" | "halfOpen" | "closed" {
    if (poolBreaker.opened) {
        return "open";
    }
    if (poolBreaker.halfOpen) {
        return "halfOpen";
    }
    return "closed";
}

// Usado nos testes para não acumular estado entre casos
export function resetRedisPoolCircuit(): void {
    if (poolBreaker.opened || poolBreaker.halfOpen) {
        poolBreaker.close();
    }
}
