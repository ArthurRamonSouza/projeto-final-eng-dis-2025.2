import type { NextFunction, Request, Response } from "express";

const MAX_SAMPLES = 2000;
const durationsMs: number[] = [];

let totalRequests = 0;
let totalErrors5xx = 0;

function percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) {
        return 0;
    }
    const idx = Math.min(
        sorted.length - 1,
        Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
    );
    return sorted[idx] ?? 0;
}

/**
 * Registra latência e contagem de 5xx para o relatório (Critério 4).
 */
export function httpMetricsMiddleware(
    _req: Request,
    res: Response,
    next: NextFunction,
): void {
    const start = process.hrtime.bigint();
    res.on("finish", () => {
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        totalRequests += 1;
        if (res.statusCode >= 500) {
            totalErrors5xx += 1;
        }
        durationsMs.push(ms);
        if (durationsMs.length > MAX_SAMPLES) {
            durationsMs.splice(0, durationsMs.length - MAX_SAMPLES);
        }
    });
    next();
}

export function getHttpMetricsSnapshot(): {
    requests_total: number;
    errors_5xx_total: number;
    latency_ms: { p50: number; p95: number; avg: number; samples: number };
} {
    const sorted = [...durationsMs].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    return {
        requests_total: totalRequests,
        errors_5xx_total: totalErrors5xx,
        latency_ms: {
            p50: percentile(sorted, 50),
            p95: percentile(sorted, 95),
            avg: sorted.length ? sum / sorted.length : 0,
            samples: sorted.length,
        },
    };
}
