import { useState } from "react";
import type { CreateAdPayload } from "../types";

type AdFormProps = {
  onSubmit: (payload: CreateAdPayload) => Promise<void>;
  isSubmitting: boolean;
};

const initialForm: CreateAdPayload = {
  title: "",
  advertiser_name: "",
  content_type: "transcript",
  content_text: "",
};

export function AdForm({ onSubmit, isSubmitting }: AdFormProps) {
  const [form, setForm] = useState<CreateAdPayload>(initialForm);

  function updateField<K extends keyof CreateAdPayload>(field: K, value: CreateAdPayload[K]) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim() || !form.advertiser_name.trim() || !form.content_text.trim()) {
      return;
    }

    await onSubmit({
      title: form.title.trim(),
      advertiser_name: form.advertiser_name.trim(),
      content_type: form.content_type,
      content_text: form.content_text.trim(),
    });

    setForm(initialForm);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Cadastrar anúncio</h3>
        <p className="mt-1 text-sm text-slate-600">
          Informe o conteúdo base que será usado na geração dos desafios.
        </p>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Título</span>
        <input
          type="text"
          value={form.title}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="Ex.: Campanha Tênis Runner X"
          disabled={isSubmitting}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Anunciante</span>
        <input
          type="text"
          value={form.advertiser_name}
          onChange={(e) => updateField("advertiser_name", e.target.value)}
          placeholder="Ex.: Marca X"
          disabled={isSubmitting}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Tipo de conteúdo</span>
        <select
          value={form.content_type}
          onChange={(e) =>
            updateField("content_type", e.target.value as CreateAdPayload["content_type"])
          }
          disabled={isSubmitting}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
        >
          <option value="transcript">Transcrição</option>
          <option value="description">Descrição</option>
          <option value="summary">Resumo</option>
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Conteúdo textual</span>
        <textarea
          value={form.content_text}
          onChange={(e) => updateField("content_text", e.target.value)}
          placeholder="Cole aqui a transcrição ou uma descrição do anúncio..."
          disabled={isSubmitting}
          rows={7}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Salvando..." : "Criar anúncio"}
      </button>
    </form>
  );
}