import { createHash } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { redis } from "../lib/redis.js";

const LUA_INCR_EXPIRE = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
end
local ttl = redis.call('TTL', KEYS[1])
return { count, ttl }
`;

function getClientIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
        return forwarded.split(",")[0]?.trim() ?? "unknown";
    }
    if (Array.isArray(forwarded) && forwarded[0]) {
        return forwarded[0].trim();
    }
    return req.ip || req.socket.remoteAddress || "unknown";
}

function ipRateLimitKey(ip: string): string {
    const hash = createHash("sha256").update(ip, "utf8").digest("hex");
    return `ratelimit:ip:${hash}`;
}

/**
 * Limita requisições por endereço IP (cliente). Acima do limite na janela: **429** e cabeçalho **Retry-After**.
 * Não aplica a rotas `/health` (liveness/readiness).
 * Se o Redis falhar, falha aberta (pedido segue).
 */
export async function ipRateLimit(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    if (!env.RATE_LIMIT_ENABLED) {
        next();
        return;
    }

    if (req.path === "/health" || req.path.startsWith("/health/")) {
        next();
        return;
    }

    const ip = getClientIp(req);
    const key = ipRateLimitKey(ip);
    const windowSec = env.RATE_LIMIT_WINDOW_SEC;
    const max = env.RATE_LIMIT_MAX;

    try {
        const raw = (await redis.eval(
            LUA_INCR_EXPIRE,
            1,
            key,
            String(windowSec),
        )) as unknown;
        const tuple = raw as [number, number];
        const count = Number(tuple[0]);
        const ttl = Number(tuple[1]);

        res.setHeader("X-RateLimit-Limit", String(max));
        res.setHeader(
            "X-RateLimit-Remaining",
            String(Math.max(0, max - count)),
        );

        if (count > max) {
            const retryAfter = ttl > 0 ? ttl : windowSec;
            res.setHeader("Retry-After", String(retryAfter));
            res.status(429).json({
                error: "RATE_LIMIT_EXCEEDED",
                message:
                    "Muitas requisições deste cliente. Aguarde antes de tentar novamente.",
                retry_after_seconds: retryAfter,
            });
            return;
        }
    } catch {
        /* Redis indisponível — não bloquear o tráfego */
    }

    next();
}
