import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createAd, listAds } from "../api/ads";
import type { Ad, CreateAdPayload } from "../types";
import { AdForm } from "../components/AdForm";
import { AdList } from "../components/AdList";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { AppButton } from "../components/AppButton";

export function AdsPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadAds(showToast = false) {
    try {
      setErrorMessage(null);
      setIsLoading(true);

      const response = await listAds();
      setAds(response.items);

      if (showToast) {
        toast.success("Lista de anúncios atualizada.");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Não foi possível carregar os anúncios.");
      toast.error("Falha ao carregar os anúncios.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateAd(payload: CreateAdPayload) {
    const loadingToastId = toast.loading("Criando anúncio...");

    try {
      setErrorMessage(null);
      setIsSubmitting(true);

      await createAd(payload);
      await loadAds(false);

      toast.success("Anúncio criado com sucesso.", { id: loadingToastId });
    } catch (error) {
      console.error(error);
      setErrorMessage("Não foi possível criar o anúncio.");
      toast.error("Falha ao criar o anúncio.", { id: loadingToastId });
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    void loadAds();
  }, []);

  return (
    <section className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AdForm onSubmit={handleCreateAd} isSubmitting={isSubmitting} />

        <div className="grid gap-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Lista de anúncios</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Conteúdos disponíveis para geração e consumo de desafios.
                </p>
              </div>

              <AppButton
                type="button"
                variant="secondary"
                onClick={() => void loadAds(true)}
                disabled={isLoading}
              >
                Atualizar
              </AppButton>
            </div>
          </div>

          {errorMessage && <ErrorState message={errorMessage} />}
          {isLoading ? <LoadingState message="Carregando anúncios..." /> : <AdList items={ads} />}
        </div>
      </div>
    </section>
  );
}