export type PoolStatus = {
  ad_id: string;
  pool_size: number;
  pool_min: number;
  pool_target: number;
  refill_needed: boolean;
  refill_in_progress: boolean;
};

export type RefillRequestPayload = {
  requested_count: number;
};

export type RefillResponse = {
  job: {
    job_id: string;
    ad_id: string;
    requested_count: number;
    reason: "manual_refill" | "low_pool" | "initial_fill";
    status: "pending" | "processing" | "completed" | "failed";
  };
};