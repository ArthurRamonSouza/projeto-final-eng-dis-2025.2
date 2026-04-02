import { api } from "./client";
import { ENGINE_PATHS } from "../config/engine-endpoints";
import type { MetricsSummaryResponse } from "../types/metrics";

export async function getMetricsSummary(): Promise<MetricsSummaryResponse> {
  const { data } = await api.get<MetricsSummaryResponse>(ENGINE_PATHS.metricsSummary);
  return data;
}
