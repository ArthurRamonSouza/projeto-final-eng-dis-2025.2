import type { DependenciesHealthResponse } from "../types";

type DependenciesHealthCardProps = {
  data: DependenciesHealthResponse;
};

function HealthBadge({ label, status }: { label: string; status: "ok" | "error" }) {
  const isOk = status === "ok";

  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={["mt-2 text-sm font-semibold", isOk ? "text-emerald-700" : "text-rose-700"].join(" ")}>
        {isOk ? "OK" : "ERRO"}
      </p>
    </div>
  );
}

export function DependenciesHealthCard({ data }: DependenciesHealthCardProps) {
  return (
    <article className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Health do Sistema</h3>
        <p className="mt-1 text-sm text-slate-600">
          Verificação do estado da API e das dependências principais.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <HealthBadge label="API" status={data.status} />
        <HealthBadge label="Redis" status={data.dependencies.redis} />
        <HealthBadge label="PostgreSQL" status={data.dependencies.postgres} />
      </div>
    </article>
  );
}