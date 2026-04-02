import type { RedisPoolCircuitResponse } from "../types";

type RedisPoolCircuitCardProps = {
  data: RedisPoolCircuitResponse;
};

function circuitClass(state: "open" | "half_open" | "closed") {
  if (state === "closed") return "bg-emerald-100 text-emerald-700";
  if (state === "half_open") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

export function RedisPoolCircuitCard({ data }: RedisPoolCircuitCardProps) {
  return (
    <article className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">
          Circuit Breaker do Pool Redis
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Estado atual do circuito de proteção associado ao pool de desafios.
        </p>
      </div>

      <div>
        <span
          className={[
            "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
            circuitClass(data.redis_challenge_pool_circuit),
          ].join(" ")}
        >
          Estado: {data.redis_challenge_pool_circuit}
        </span>
      </div>
    </article>
  );
}