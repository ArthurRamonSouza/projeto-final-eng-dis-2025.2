import { useState } from "react";
import { AdsPage } from "./pages/AdsPage";
import { ChallengePage } from "./pages/ChallengePage";
import { StatusPage } from "./pages/StatusPage";

type TabKey = "ads" | "challenge" | "status";

const tabs: Array<{ key: TabKey; label: string; description: string }> = [
  {
    key: "ads",
    label: "Anúncios",
    description: "Cadastro e gestão do conteúdo base",
  },
  {
    key: "challenge",
    label: "Desafios",
    description: "Consumo em tempo real do pool",
  },
  {
    key: "status",
    label: "Status",
    description: "Monitoramento do pool e health checks",
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("ads");

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-slate-200 bg-slate-900 px-6 py-8 text-white lg:border-b-0 lg:border-r lg:border-slate-800">
          <div className="mb-8">
            <span className="mb-3 inline-flex rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-200">
              POC • Sistemas Distribuídos
            </span>
            <h1 className="text-2xl font-bold leading-tight">
              IA como Pool
            </h1>
            <p className="mt-3 text-sm text-slate-300">
              Sistema de geração e entrega de desafios com IA desacoplada do fluxo crítico.
            </p>
          </div>

          <nav className="grid gap-3">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    "rounded-2xl border px-4 py-4 text-left transition",
                    isActive
                      ? "border-violet-400 bg-violet-500/20 shadow-sm"
                      : "border-slate-700 bg-slate-800/70 hover:border-slate-500 hover:bg-slate-800",
                  ].join(" ")}
                >
                  <p className="text-sm font-semibold">{tab.label}</p>
                  <p className="mt-1 text-xs text-slate-300">{tab.description}</p>
                </button>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
            <p className="text-sm font-semibold">Objetivo da demo</p>
            <p className="mt-2 text-xs leading-5 text-slate-300">
              Mostrar cadastro do anúncio, consumo do desafio pelo pool em Redis e monitoramento do refill com fallback estático.
            </p>
          </div>
        </aside>

        <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <header className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium text-violet-600">Ambiente da POC</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  {tabs.find((tab) => tab.key === activeTab)?.label}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {tabs.find((tab) => tab.key === activeTab)?.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Node.js / Express
                </span>
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                  Python / FastAPI
                </span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  Redis
                </span>
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                  PostgreSQL
                </span>
              </div>
            </div>
          </header>

          <div className="grid gap-6">
            {activeTab === "ads" && <AdsPage />}
            {activeTab === "challenge" && <ChallengePage />}
            {activeTab === "status" && <StatusPage />}
          </div>
        </main>
      </div>
    </div>
  );
}