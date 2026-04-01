import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getPoolStatus, listAds, triggerRefill } from "../api/ads";
import { getDependenciesHealth } from "../api/health";
import type { Ad, DependenciesHealthResponse, PoolStatus } from "../types";
import { AdSelector } from "../components/AdSelector";
import { PoolStatusCard } from "../components/PoolStatusCard";
import { DependenciesHealthCard } from "../components/DependenciesHealthCard";
import { RefillButton } from "../components/RefillButton";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { AppButton } from "../components/AppButton";

const POOL_AUTO_REFRESH_MS = 5000;
const HEALTH_AUTO_REFRESH_MS = 10000;

function formatLastUpdate(date: Date | null) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function StatusPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [selectedAdId, setSelectedAdId] = useState("");
  const [poolStatus, setPoolStatus] = useState<PoolStatus | null>(null);
  const [healthData, setHealthData] = useState<DependenciesHealthResponse | null>(null);

  const [isLoadingAds, setIsLoadingAds] = useState(true);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [isSubmittingRefill, setIsSubmittingRefill] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [lastPoolUpdatedAt, setLastPoolUpdatedAt] = useState<Date | null>(null);
  const [lastHealthUpdatedAt, setLastHealthUpdatedAt] = useState<Date | null>(null);

  const poolIntervalRef = useRef<number | null>(null);
  const healthIntervalRef = useRef<number | null>(null);

  async function loadAds() {
    try {
      setErrorMessage(null);
      setIsLoadingAds(true);

      const response = await listAds();
      setAds(response.items);

      if (response.items.length > 0 && !selectedAdId) {
        setSelectedAdId(response.items[0].id);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Não foi possível carregar os anúncios.");
      toast.error("Falha ao carregar anúncios.");
    } finally {
      setIsLoadingAds(false);
    }
  }

  async function loadPoolStatus(
    adId: string,
    options?: { showToast?: boolean; silent?: boolean },
  ) {
    const showToast = options?.showToast ?? false;
    const silent = options?.silent ?? false;

    try {
      setErrorMessage(null);

      if (!silent) {
        setIsLoadingStatus(true);
      }

      const response = await getPoolStatus(adId);
      setPoolStatus(response);
      setLastPoolUpdatedAt(new Date());

      if (showToast) {
        toast.success("Status do pool atualizado.");
      }
    } catch (error) {
      console.error(error);

      if (!silent) {
        setErrorMessage("Não foi possível carregar o status do pool.");
        toast.error("Falha ao carregar status do pool.");
      }
    } finally {
      if (!silent) {
        setIsLoadingStatus(false);
      }
    }
  }

  async function loadHealth(options?: { showToast?: boolean; silent?: boolean }) {
    const showToast = options?.showToast ?? false;
    const silent = options?.silent ?? false;

    try {
      setErrorMessage(null);

      if (!silent) {
        setIsLoadingHealth(true);
      }

      const response = await getDependenciesHealth();
      setHealthData(response);
      setLastHealthUpdatedAt(new Date());

      if (showToast) {
        toast.success("Health do sistema atualizado.");
      }
    } catch (error) {
      console.error(error);

      if (!silent) {
        setErrorMessage("Não foi possível carregar o health das dependências.");
        toast.error("Falha ao carregar health do sistema.");
      }
    } finally {
      if (!silent) {
        setIsLoadingHealth(false);
      }
    }
  }

  async function handleManualRefill() {
    if (!selectedAdId) {
      setErrorMessage("Selecione um anúncio antes de solicitar refill.");
      toast.warning("Selecione um anúncio antes de solicitar refill.");
      return;
    }

    const loadingToastId = toast.loading("Solicitando refill manual...");

    try {
      setErrorMessage(null);
      setIsSubmittingRefill(true);

      await triggerRefill(selectedAdId, { requested_count: 5 });
      toast.success("Refill manual solicitado com sucesso.", { id: loadingToastId });

      await loadPoolStatus(selectedAdId, { silent: false });
    } catch (error) {
      console.error(error);
      setErrorMessage("Não foi possível solicitar refill manual.");
      toast.error("Falha ao solicitar refill manual.", { id: loadingToastId });
    } finally {
      setIsSubmittingRefill(false);
    }
  }

  async function handleRefreshAll() {
    if (selectedAdId) {
      await Promise.all([
        loadPoolStatus(selectedAdId, { showToast: true, silent: false }),
        loadHealth({ showToast: true, silent: false }),
      ]);
      return;
    }

    await loadHealth({ showToast: true, silent: false });
  }

  useEffect(() => {
    void loadAds();
    void loadHealth({ silent: false });
  }, []);

  useEffect(() => {
    if (selectedAdId) {
      void loadPoolStatus(selectedAdId, { silent: false });
    }
  }, [selectedAdId]);

  useEffect(() => {
    if (!selectedAdId) return;

    if (poolIntervalRef.current) {
      window.clearInterval(poolIntervalRef.current);
    }

    poolIntervalRef.current = window.setInterval(() => {
      void loadPoolStatus(selectedAdId, { silent: true });
    }, POOL_AUTO_REFRESH_MS);

    return () => {
      if (poolIntervalRef.current) {
        window.clearInterval(poolIntervalRef.current);
        poolIntervalRef.current = null;
      }
    };
  }, [selectedAdId]);

  useEffect(() => {
    if (healthIntervalRef.current) {
      window.clearInterval(healthIntervalRef.current);
    }

    healthIntervalRef.current = window.setInterval(() => {
      void loadHealth({ silent: true });
    }, HEALTH_AUTO_REFRESH_MS);

    return () => {
      if (healthIntervalRef.current) {
        window.clearInterval(healthIntervalRef.current);
        healthIntervalRef.current = null;
      }
    };
  }, []);

  return (
    <section className="grid gap-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Monitoramento da POC</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Auto refresh: pool {POOL_AUTO_REFRESH_MS / 1000}s
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Health {HEALTH_AUTO_REFRESH_MS / 1000}s
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-600">
              Consulte o estado do pool por anúncio, verifique a saúde das dependências e dispare refill manual.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Última atualização do pool
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {formatLastUpdate(lastPoolUpdatedAt)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Última atualização do health
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {formatLastUpdate(lastHealthUpdatedAt)}
              </p>
            </div>
          </div>

          {errorMessage && <ErrorState message={errorMessage} />}

          {isLoadingAds ? (
            <LoadingState message="Carregando anúncios..." />
          ) : (
            <>
              <AdSelector
                items={ads}
                selectedAdId={selectedAdId}
                onChange={setSelectedAdId}
                disabled={isSubmittingRefill || isLoadingStatus}
              />

              <div className="flex flex-wrap gap-3">
                <RefillButton
                  onClick={handleManualRefill}
                  disabled={!selectedAdId}
                  isLoading={isSubmittingRefill}
                />

                <AppButton
                  type="button"
                  variant="secondary"
                  onClick={() => void handleRefreshAll()}
                  disabled={isLoadingStatus || isLoadingHealth || isSubmittingRefill}
                >
                  Atualizar status
                </AppButton>
              </div>
            </>
          )}
        </div>
      </div>

      {isLoadingStatus && !poolStatus && (
        <LoadingState message="Carregando status do pool..." />
      )}
      {poolStatus && <PoolStatusCard data={poolStatus} />}

      {isLoadingHealth && !healthData ? (
        <LoadingState message="Carregando health do sistema..." />
      ) : (
        healthData && <DependenciesHealthCard data={healthData} />
      )}
    </section>
  );
}