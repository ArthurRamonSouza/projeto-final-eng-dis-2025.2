import { api } from "./client";
import type { HealthResponse, DependenciesHealthResponse } from "../types";

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>("/health");
  return data;
}

export async function getDependenciesHealth(): Promise<DependenciesHealthResponse> {
  const { data } = await api.get<DependenciesHealthResponse>("/health/dependencies");
  return data;
}