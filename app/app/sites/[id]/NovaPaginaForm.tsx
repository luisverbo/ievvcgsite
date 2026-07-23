"use client";

import { useActionState, useState } from "react";
import { criarPagina, type PaginaState } from "./paginas/actions";
import { slugify } from "@/lib/format";
import { inputClass, labelClass, btnPrimary } from "@/components/painel/ui";

export default function NovaPaginaForm({ siteId }: { siteId: string }) {
  const [state, formAction, pending] = useActionState<PaginaState, FormData>(criarPagina, undefined);
  const [slug, setSlug] = useState("");
  const [aberto, setAberto] = useState(false);

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} className="flex-1 rounded-lg border border-dashed border-white/25 py-2.5 text-sm font-semibold hover:border-brand-2">
        + Página em branco
      </button>
    );
  }

  return (
    <form action={formAction} className="flex basis-full flex-col gap-3 rounded-lg border border-white/10 bg-ink-3 p-4 sm:flex-row sm:items-end">
      <input type="hidden" name="site_id" value={siteId} />
      <div className="flex flex-1 flex-col gap-1.5">
        <label className={labelClass}>Nome da página</label>
        <input name="titulo" required className={inputClass} onChange={(e) => setSlug(slugify(e.target.value))} />
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <label className={labelClass}>Endereço (/…)</label>
        <input name="slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} className={inputClass} />
      </div>
      <button type="submit" disabled={pending} className={`${btnPrimary} px-5 py-2.5`}>
        {pending ? "Criando…" : "Criar"}
      </button>
      {state?.error && <p className="text-sm text-danger sm:basis-full">{state.error}</p>}
    </form>
  );
}
