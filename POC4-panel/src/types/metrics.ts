export type MetricsSummaryResponse = {
  service: string;
  http: {
    requests_total: number;
    errors_5xx_total: number;
    latency_ms: {
      p50: number;
      p95: number;
      avg: number;
      samples: number;
    };
  };
  refill_queue_bullmq: {
    waiting: number;
    active: number;
    delayed: number;
    failed: number;
    completed: number;
  };
  pool_redis: {
    total_challenges_in_pools: number;
    pool_keys_sampled: number;
  };
  ai_dlq: {
    redis_list_key: string;
    depth: number;
  };
  load_shed: {
    enabled: boolean;
    max_waiting_jobs: number;
    concurrent_slots_max: number;
  };
};

export type RedisPoolCircuitResponse = {
  service: string;
  redis_challenge_pool_circuit: "open" | "half_open" | "closed";
};