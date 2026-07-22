"use client";

import { useActionState, useState } from "react";
import { criarSite, type NovoSiteState } from "./actions";
import { slugify } from "@/lib/format";
import { IconPlus, IconX } from "@/components/painel/icons";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "seudominio.com.br";

export default function NovoSite({ variante = "botao" }: { variante?: "botao" | "vazio" }) {
  const [aberto, setAberto] = useState(false);
  const [slug, setSlug] = useState("");
  const [state, formAction, pending] = useActionState<NovoSiteState, FormData>(criarSite, undefined);

  return (
    <>
      {variante === "vazio" ? (
        <button
          onClick={() => setAberto(true)}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 p-10 text-center text-paper-dim transition hover:border-brand-2 hover:text-paper"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/20 text-brand-2">
            <IconPlus size={20} />
          </span>
          <span className="text-sm font-semibold">Criar meu primeiro site</span>
        </button>
      ) : (
        <button
          onClick={() => setAberto(true)}
          className="flex items-center gap-1.5 rounded-lg border border-white/15 px-4 py-2 text-sm font-bold text-paper transition hover:border-brand-2 hover:text-brand-2"
        >
          <IconPlus size={15} /> Novo site
        </button>
      )}

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setAberto(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-2 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Novo site</h2>
              <button
                onClick={() => setAberto(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-paper-dim transition hover:bg-white/10 hover:text-paper"
              >
                <IconX size={16} />
              </button>
            </div>

            <form action={formAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-paper-dim">Nome do site</label>
                <input
                  name="nome"
                  required
                  autoFocus
                  className="rounded-lg border border-white/10 bg-ink px-4 py-2.5 outline-none focus-visible:border-brand-2"
                  placeholder="Minha Landing Page"
                  onChange={(e) => setSlug(slugify(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-paper-dim">Endereço</label>
                <div className="flex items-center gap-2">
                  <input
                    name="slug"
                    required
                    minLength={3}
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    className="flex-1 rounded-lg border border-white/10 bg-ink px-4 py-2.5 outline-none focus-visible:border-brand-2"
                    placeholder="minha-pagina"
                  />
                  <span className="text-sm text-paper-dim">.{ROOT}</span>
                </div>
              </div>

              {state?.error && <p className="text-sm text-danger">{state.error}</p>}

              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-brand py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
              >
                {pending ? "Criando…" : "Criar site"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
