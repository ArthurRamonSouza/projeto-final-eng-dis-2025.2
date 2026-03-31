import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getChallenge, listAds } from "../api/ads";
import type { Ad, ChallengeResponse } from "../types";
import { AdSelector } from "../components/AdSelector";
import { ChallengeCard } from "../components/ChallengeCard";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { AppButton } from "../components/AppButton";

export function ChallengePage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [selectedAdId, setSelectedAdId] = useState("");
  const [challengeData, setChallengeData] = useState<ChallengeResponse | null>(null);
  const [isLoadingAds, setIsLoadingAds] = useState(true);
  const [isFetchingChallenge, setIsFetchingChallenge] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadAds(showToast = false) {
    try {
      setErrorMessage(null);
      setIsLoadingAds(true);

      const response = await listAds();
      setAds(response.items);

      if (response.items.length > 0 && !selectedAdId) {
        setSelectedAdId(response.items[0].id);
      }

      if (showToast) {
        toast.success("Anúncios atualizados.");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Não foi possível carregar os anúncios para consumo.");
      toast.error("Falha ao carregar anúncios.");
    } finally {
      setIsLoadingAds(false);
    }
  }

  async function handleGetChallenge() {
    if (!selectedAdId) {
      setErrorMessage("Selecione um anúncio antes de solicitar um desafio.");
      toast.warning("Selecione um anúncio antes de continuar.");
      return;
    }

    const loadingToastId = toast.loading("Solicitando desafio...");

    try {
      setErrorMessage(null);
      setIsFetchingChallenge(true);
      setChallengeData(null);

      const response = await getChallenge(selectedAdId);
      setChallengeData(response);

      if (response.fallback_used) {
        toast.success("Desafio obtido com fallback estático.", { id: loadingToastId });
      } else {
        toast.success("Desafio obtido com sucesso.", { id: loadingToastId });
      }
    } catch (error: any) {
      console.error(error);

      if (error?.response?.data?.error === "NO_CHALLENGE_AVAILABLE") {
        setErrorMessage("Nenhum desafio disponível para este anúncio.");
        toast.error("Nenhum desafio disponível.", { id: loadingToastId });
      } else {
        setErrorMessage("Não foi possível obter o desafio.");
        toast.error("Falha ao obter o desafio.", { id: loadingToastId });
      }
    } finally {
      setIsFetchingChallenge(false);
    }
  }

  useEffect(() => {
    void loadAds();
  }, []);

  return (
    <section className="grid gap-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Solicitar desafio</h3>
            <p className="mt-1 text-sm text-slate-600">
              O sistema busca primeiro no pool em Redis e utiliza fallback estático quando necessário.
            </p>
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
                disabled={isFetchingChallenge}
              />

              <div className="flex flex-wrap gap-3">
                <AppButton
                  type="button"
                  onClick={() => void handleGetChallenge()}
                  disabled={ads.length === 0}
                  isLoading={isFetchingChallenge}
                >
                  Obter desafio
                </AppButton>

                <AppButton
                  type="button"
                  variant="secondary"
                  onClick={() => void loadAds(true)}
                  disabled={isLoadingAds || isFetchingChallenge}
                >
                  Atualizar anúncios
                </AppButton>
              </div>
            </>
          )}
        </div>
      </div>

      {isFetchingChallenge && <LoadingState message="Solicitando desafio..." />}
      {challengeData && <ChallengeCard data={challengeData} />}
    </section>
  );
}