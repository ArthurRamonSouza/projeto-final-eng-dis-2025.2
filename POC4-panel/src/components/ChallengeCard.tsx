import type { ChallengeResponse } from "../types";

type ChallengeCardProps = {
  data: ChallengeResponse;
};

function SourceBadge({ source }: { source: "ai" | "static" }) {
  const isAI = source === "ai";

  return (
    <span
      className={[
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
        isAI
          ? "bg-emerald-100 text-emerald-700"
          : "bg-amber-100 text-amber-700",
      ].join(" ")}
    >
      {isAI ? "Origem: IA" : "Origem: Fallback estático"}
    </span>
  );
}

export function ChallengeCard({ data }: ChallengeCardProps) {
  const { challenge, fallback_used, pool_size_after_consume, refill_requested } = data;

  return (
    <article className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap gap-2">
        <SourceBadge source={challenge.source} />

        <span
          className={[
            "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
            fallback_used ? "bg-rose-100 text-rose-700" : "bg-sky-100 text-sky-700",
          ].join(" ")}
        >
          {fallback_used ? "Fallback utilizado" : "Sem fallback"}
        </span>

        <span
          className={[
            "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
            refill_requested ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-700",
          ].join(" ")}
        >
          {refill_requested ? "Refill solicitado" : "Refill não solicitado"}
        </span>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Pergunta
        </p>
        <p className="text-base font-medium text-slate-900">{challenge.question}</p>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Alternativas
        </p>
        <div className="grid gap-3">
          {challenge.options.map((option, index) => (
            <div
              key={`${challenge.id}-${index}`}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"
            >
              <span className="mr-2 font-semibold text-slate-500">
                {String.fromCharCode(65 + index)}.
              </span>
              {option}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
        <p>
          <strong>Challenge ID:</strong> {challenge.id}
        </p>
        <p>
          <strong>Ad ID:</strong> {challenge.ad_id}
        </p>
        <p>
          <strong>Pool restante:</strong> {pool_size_after_consume}
        </p>
      </div>
    </article>
  );
}