import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { redis } from "../lib/redis.js";
import { withTimeout } from "../lib/with-timeout.js";
import { getRefillQueueCounts } from "../queues/refill-queue.js";

/** Evita bloqueio indefinido em BullMQ/Redis quando o broker está indisponível. */
const REDIS_OP_TIMEOUT_MS = 5_000;

const SLOTS_KEY = "engine:load:concurrent_slots";

const LUA_ACQUIRE = `
local c = redis.call('INCR', KEYS[1])
if c > tonumber(ARGV[1]) then
  redis.call('DECR', KEYS[1])
  return 0
end
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))
return 1
`;

function isExemptPath(path: string): boolean {
    return (
        path === "/health" ||
        path.startsWith("/health/") ||
        path === "/metrics" ||
        path.startsWith("/metrics/")
    );
}

/**
 * Descarte de carga: 503 quando a fila BullMQ de refill está muito cheia e/ou
 * há demasiadas requisições em voo (slots Redis), protegendo a Engine em picos.
 */
export async function loadSheddingMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    if (!env.LOAD_SHED_ENABLED || isExemptPath(req.path)) {
        next();
        return;
    }

    try {
        const counts = await withTimeout(
            getRefillQueueCounts(),
            REDIS_OP_TIMEOUT_MS,
        );
        const backlog = counts.waiting + counts.delayed;
        if (backlog > env.LOAD_SHED_MAX_WAITING) {
            res.setHeader(
                "Retry-After",
                String(Math.min(30, 5 + Math.floor(backlog / 100))),
            );
            res.status(503).json({
                error: "LOAD_SHEDDING",
                message:
                    "Serviço temporariamente sobrecarregido (fila de refill). Tente novamente em instantes.",
                queue_backlog: backlog,
            });
            return;
        }

        if (env.LOAD_SHED_CONCURRENT_MAX > 0) {
            const raw = (await withTimeout(
                redis.eval(
                    LUA_ACQUIRE,
                    1,
                    SLOTS_KEY,
                    String(env.LOAD_SHED_CONCURRENT_MAX),
                    String(env.LOAD_SHED_SLOT_TTL_SEC),
                ),
                REDIS_OP_TIMEOUT_MS,
            )) as unknown;
            const ok = Number(raw) === 1;
            if (!ok) {
                res.setHeader("Retry-After", "3");
                res.status(503).json({
                    error: "LOAD_SHEDDING",
                    message:
                        "Capacidade simultânea da Engine esgotada. Tente novamente em instantes.",
                });
                return;
            }
            res.on("finish", () => {
                redis.decr(SLOTS_KEY).catch(() => {
                    /* ignore */
                });
            });
        }
    } catch {
        /* Redis/BullMQ indisponível — não bloquear */
    }

    next();
}
