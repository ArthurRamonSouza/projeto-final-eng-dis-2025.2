/**
 * Paths da Engine relativos a `VITE_API_BASE_URL`.
 * Base completa: `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"}${path}`
 */
export const ENGINE_PATHS = {
  metricsSummary: "/metrics/summary",
  health: "/health",
  healthDependencies: "/health/dependencies",
  healthToggleAi: "/health/toggle-ai",
  ads: "/ads",
  adById: (adId: string) => `/ads/${adId}` as const,
  adChallenge: (adId: string) => `/ads/${adId}/challenge` as const,
  adPoolStatus: (adId: string) => `/ads/${adId}/pool-status` as const,
  adRefill: (adId: string) => `/ads/${adId}/refill` as const,
} as const;
