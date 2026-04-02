import { api } from "./client";
import type {
  HealthResponse,
  DependenciesHealthResponse,
  ToggleAIRequest,
  ToggleAIResponse,
  RedisPoolCircuitResponse,
  AiFeatureFlagResponse,
} from "../types";

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>("/health");
  return data;
}

export async function getDependenciesHealth(): Promise<DependenciesHealthResponse> {
  const { data } = await api.get<DependenciesHealthResponse>("/health/dependencies");
  return data;
}

export async function getRedisPoolCircuit(): Promise<RedisPoolCircuitResponse> {
  const { data } = await api.get<RedisPoolCircuitResponse>("/health/redis-pool-circuit");
  return data;
}

export async function getAiFeatureFlag(): Promise<AiFeatureFlagResponse> {
  const { data } = await api.get<AiFeatureFlagResponse>("/health/ai-feature-flag");
  return data;
}

export async function toggleAI(payload: ToggleAIRequest): Promise<ToggleAIResponse> {
  const { data } = await api.post<ToggleAIResponse>("/health/toggle-ai", payload);
  return data;
}