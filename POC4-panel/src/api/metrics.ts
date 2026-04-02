import { api } from "./client";
import type { MetricsSummaryResponse } from "../types";

export async function getMetricsSummary(): Promise<MetricsSummaryResponse> {
  const { data } = await api.get<MetricsSummaryResponse>("/metrics/summary");
  return data;
}