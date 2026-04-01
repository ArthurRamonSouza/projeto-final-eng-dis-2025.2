import type { Ad } from "../types";

type AdSelectorProps = {
  items: Ad[];
  selectedAdId: string;
  onChange: (adId: string) => void;
  disabled?: boolean;
};

export function AdSelector({
  items,
  selectedAdId,
  onChange,
  disabled = false,
}: AdSelectorProps) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">Selecione um anúncio</span>
      <select
        value={selectedAdId}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
      >
        <option value="">Selecione...</option>
        {items.map((ad) => (
          <option key={ad.id} value={ad.id}>
            {ad.title} — {ad.advertiser_name}
          </option>
        ))}
      </select>
    </label>
  );
}