import { AppButton } from "./AppButton";

type AIToggleCardProps = {
  /** `null` enquanto o estado é carregado do Redis (engine). */
  aiEnabled: boolean | null;
  isLoading: boolean;
  onToggle: () => Promise<void>;
};

export function AIToggleCard({
  aiEnabled,
  isLoading,
  onToggle,
}: AIToggleCardProps) {
  return (
    <article className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Controle do agente de IA</h3>
        <p className="mt-1 text-sm text-slate-600">
          Permite ligar ou desligar a integração com o agente LLM para demonstrar cenários de resiliência.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span
          className={[
            "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
            aiEnabled === null
              ? "bg-slate-100 text-slate-600"
              : aiEnabled
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700",
          ].join(" ")}
        >
          {aiEnabled === null
            ? "Sincronizando com Redis…"
            : aiEnabled
              ? "IA habilitada"
              : "IA desabilitada"}
        </span>
      </div>

      <div>
        <AppButton
          type="button"
          variant={
            aiEnabled === null ? "secondary" : aiEnabled ? "danger" : "success"
          }
          onClick={() => void onToggle()}
          isLoading={isLoading}
          disabled={aiEnabled === null}
        >
          {aiEnabled === null
            ? "Aguarde…"
            : aiEnabled
              ? "Desligar IA"
              : "Ligar IA"}
        </AppButton>
      </div>
    </article>
  );
}