import type { PoolStatus } from "../types";

type PoolStatusCardProps = {
  data: PoolStatus;
};

function StatusPill({
  label,
  active,
  activeClassName,
}: {
  label: string;
  active: boolean;
  activeClassName: string;
}) {
  return (
    <span
      className={[
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
        active ? activeClassName : "bg-slate-100 text-slate-700",
      ].join(" ")}
    >
      {label}: {active ? "Sim" : "Não"}
    </span>
  );
}

export function PoolStatusCard({ data }: PoolStatusCardProps) {
  return (
    <article className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Status do Pool</h3>
        <p className="mt-1 text-sm text-slate-600">
          Monitoramento do estoque de desafios por anúncio.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ad ID</p>
          <p className="mt-2 text-sm font-medium text-slate-900">{data.ad_id}</p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pool atual</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{data.pool_size}</p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pool mínimo</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{data.pool_min}</p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pool alvo</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{data.pool_target}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatusPill
          label="Refill necessário"
          active={data.refill_needed}
          activeClassName="bg-amber-100 text-amber-700"
        />
        <StatusPill
          label="Refill em andamento"
          active={data.refill_in_progress}
          activeClassName="bg-violet-100 text-violet-700"
        />
      </div>
    </article>
  );
}