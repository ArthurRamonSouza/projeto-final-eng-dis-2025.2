type HealthBody = {
    status?: string;
    redis?: string;
    circuit_breaker?: string;
};

let cache: { atMs: number; shedding: boolean } | null = null;

function sheddingEnabled(): boolean {
    return (
        (process.env.LOAD_SHEDDING_ENABLED ?? "false").toLowerCase() === "true"
    );
}

function workerBaseUrl(): string {
    return process.env.AI_WORKER_BASE_URL ?? "http://localhost:8001";
}

function healthTimeoutMs(): number {
    return Number(process.env.LOAD_SHEDDING_HEALTH_TIMEOUT_MS ?? 800);
}

function cacheTtlMs(): number {
    return Number(process.env.LOAD_SHEDDING_CACHE_MS ?? 2000);
}

function parseHealth(json: unknown): HealthBody {
    return typeof json === "object" && json !== null
        ? (json as HealthBody)
        : {};
}

export async function isSheddingLoad(): Promise<boolean> {
    if (!sheddingEnabled()) {
        return false;
    }
    const now = Date.now();
    if (cache !== null && now - cache.atMs < cacheTtlMs()) {
        return cache.shedding;
    }

    const shedding = await probeAiWorkerHealth();
    cache = { atMs: now, shedding };
    return shedding;
}

/** Para testes: invalida o cache de shedding. */
export function resetLoadSheddingCache(): void {
    cache = null;
}

async function probeAiWorkerHealth(): Promise<boolean> {
    const base = workerBaseUrl().replace(/\/$/, "");
    const url = `${base}/health`;
    const controller = new AbortController();
    const timeoutMs = healthTimeoutMs();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
            return true;
        }
        const body = parseHealth(await res.json());
        if (body.status !== "ok") {
            return true;
        }
        if (body.redis === "down") {
            return true;
        }
        const cb = (body.circuit_breaker ?? "").toLowerCase();
        if (cb.includes("open")) {
            return true;
        }
        return false;
    } catch {
        return true;
    } finally {
        clearTimeout(t);
    }
}
