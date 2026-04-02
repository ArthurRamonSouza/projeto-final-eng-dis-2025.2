import type { MetricsSummaryResponse } from "../types";

type MetricsSummaryCardProps = {
  data: MetricsSummaryResponse;
};

function MetricBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

export function MetricsSummaryCard({ data }: MetricsSummaryCardProps) {
  return (
    <article className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Métricas agregadas</h3>
        <p className="mt-1 text-sm text-slate-600">
          Resumo operacional da Engine para suporte à demonstração da POC.
        </p>
      </div>

      <section className="grid gap-4">
        <h4 className="text-sm font-semibold text-slate-800">HTTP</h4>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricBox label="Requests total" value={data.http.requests_total} />
          <MetricBox label="Errors 5xx total" value={data.http.errors_5xx_total} />
          <MetricBox label="Latência p50 (ms)" value={data.http.latency_ms.p50} />
          <MetricBox label="Latência p95 (ms)" value={data.http.latency_ms.p95} />
          <MetricBox label="Latência média (ms)" value={data.http.latency_ms.avg} />
          <MetricBox label="Amostras" value={data.http.latency_ms.samples} />
        </div>
      </section>

      <section className="grid gap-4">
        <h4 className="text-sm font-semibold text-slate-800">Fila BullMQ</h4>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricBox label="Waiting" value={data.refill_queue_bullmq.waiting} />
          <MetricBox label="Active" value={data.refill_queue_bullmq.active} />
          <MetricBox label="Delayed" value={data.refill_queue_bullmq.delayed} />
          <MetricBox label="Failed" value={data.refill_queue_bullmq.failed} />
          <MetricBox label="Completed" value={data.refill_queue_bullmq.completed} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-4">
          <h4 className="text-sm font-semibold text-slate-800">Pool Redis</h4>
          <MetricBox
            label="Challenges nos pools"
            value={data.pool_redis.total_challenges_in_pools}
          />
          <MetricBox
            label="Pool keys sampled"
            value={data.pool_redis.pool_keys_sampled}
          />
        </div>

        <div className="grid gap-4">
          <h4 className="text-sm font-semibold text-slate-800">DLQ da IA</h4>
          <MetricBox label="Profundidade" value={data.ai_dlq.depth} />
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Redis list key
            </p>
            <p className="mt-2 break-all text-sm font-medium text-slate-900">
              {data.ai_dlq.redis_list_key}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <h4 className="text-sm font-semibold text-slate-800">Load Shedding</h4>
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricBox
            label="Enabled"
            value={data.load_shed.enabled ? "Sim" : "Não"}
          />
          <MetricBox
            label="Max waiting jobs"
            value={data.load_shed.max_waiting_jobs}
          />
          <MetricBox
            label="Concurrent slots max"
            value={data.load_shed.concurrent_slots_max}
          />
        </div>
      </section>
    </article>
  );
}