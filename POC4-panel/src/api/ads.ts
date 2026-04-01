import { api } from "./client";
import type {
  CreateAdPayload,
  CreateAdResponse,
  ListAdsResponse,
  Ad,
  ChallengeResponse,
  PoolStatus,
  RefillRequestPayload,
  RefillResponse,
} from "../types";

export async function listAds(): Promise<ListAdsResponse> {
  const { data } = await api.get<ListAdsResponse>("/ads");
  return data;
}

export async function getAdById(adId: string): Promise<Ad> {
  const { data } = await api.get<Ad>(`/ads/${adId}`);
  return data;
}

export async function createAd(payload: CreateAdPayload): Promise<CreateAdResponse> {
  const { data } = await api.post<CreateAdResponse>("/ads", payload);
  return data;
}

export async function getChallenge(adId: string): Promise<ChallengeResponse> {
  const { data } = await api.get<ChallengeResponse>(`/ads/${adId}/challenge`);
  return data;
}

export async function getPoolStatus(adId: string): Promise<PoolStatus> {
  const { data } = await api.get<PoolStatus>(`/ads/${adId}/pool-status`);
  return data;
}

export async function triggerRefill(
  adId: string,
  payload: RefillRequestPayload,
): Promise<RefillResponse> {
  const { data } = await api.post<RefillResponse>(`/ads/${adId}/refill`, payload);
  return data;
}