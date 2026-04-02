import type { MetricsSummaryResponse } from "../types";

type MetricsSummaryCardProps = {
  data: MetricsSummaryResponse;
};

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

export function MetricsSummaryCard({ data }: MetricsSummaryCardProps) {
  const q = data.refill_queue_bullmq;
  const lat = data.http.latency_ms;

  return (
    <article className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Métricas da Engine</h3>
        <p className="mt-1 text-sm text-slate-600">
          Fonte: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">GET /metrics/summary</code> — latência,
          fila BullMQ, amostra de pools Redis e DLQ de IA.
        </p>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">HTTP (Engine)</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Pedidos totais" value={data.http.requests_total} />
          <Stat label="Erros 5xx" value={data.http.errors_5xx_total} />
          <Stat label="Latência p50 (ms)" value={lat.p50.toFixed(1)} sub={`p95: ${lat.p95.toFixed(1)} ms`} />
          <Stat label="Amostras latência" value={lat.samples} sub={`média: ${lat.avg.toFixed(1)} ms`} />
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Fila refill (BullMQ)</p>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Waiting" value={q.waiting} />
          <Stat label="Active" value={q.active} />
          <Stat label="Delayed" value={q.delayed} />
          <Stat label="Failed (DLQ BullMQ)" value={q.failed} />
          <Stat label="Completed" value={q.completed} />
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Pool Redis (amostra)</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat
            label="Desafios somados (amostra)"
            value={data.pool_redis.total_challenges_in_pools}
            sub={`chaves: ${data.pool_redis.pool_keys_sampled}`}
          />
          <Stat
            label="DLQ IA (profundidade)"
            value={data.ai_dlq.depth}
            sub={data.ai_dlq.redis_list_key}
          />
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Descarga de carga</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Ativo" value={data.load_shed.enabled ? "Sim" : "Não"} />
          <Stat label="Máx. waiting na fila" value={data.load_shed.max_waiting_jobs} />
          <Stat label="Slots concorrentes (máx.)" value={data.load_shed.concurrent_slots_max} sub="0 = desligado" />
        </div>
      </div>
    </article>
  );
}
