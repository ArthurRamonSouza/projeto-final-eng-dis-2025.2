import type { Ad } from "../types";

type AdListProps = {
  items: Ad[];
};

export function AdList({ items }: AdListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Nenhum anúncio cadastrado.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((ad) => (
        <article
          key={ad.id}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{ad.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{ad.advertiser_name}</p>
            </div>

            <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              {ad.status}
            </span>
          </div>

          <div className="mt-4 grid gap-2 text-sm text-slate-700">
            <p>
              <strong>ID:</strong> {ad.id}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}