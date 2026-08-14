"use client";

import { useActionState } from "react";
import { salvarVideoLanding, type VideoLandingState } from "./actions";
import { cardClass, inputClass } from "@/components/painel/ui";

/*
 * O controle do vídeo da página de vendas.
 *
 * `atual` chega do servidor (o link salvo) para o campo já vir preenchido —
 * assim dá para ver o que está no ar e trocar sem adivinhar.
 */
export default function VideoLanding({ atual }: { atual: string }) {
  const [estado, acao, pendente] = useActionState<VideoLandingState, FormData>(
    salvarVideoLanding,
    undefined,
  );

  return (
    <div className={cardClass}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold">🎬 Vídeo da página de vendas</h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
            atual ? "bg-ok/15 text-ok" : "bg-white/10 text-paper-dim"
          }`}
        >
          {atual ? "● no ar" : "○ sem vídeo"}
        </span>
      </div>
      <p className="mt-2 text-sm text-paper-dim">
        Cole o link de um vídeo do YouTube e ele aparece no topo da landing page, logo abaixo do
        título. Deixe vazio e salve para tirar. Perfeito para testar: uma semana com vídeo, outra
        sem, e você compara as assinaturas.
      </p>
      <form action={acao} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          name="video_url"
          defaultValue={atual}
          placeholder="https://www.youtube.com/watch?v=..."
          autoComplete="off"
          className={`${inputClass} min-w-0 flex-1 font-mono text-sm`}
        />
        <button
          type="submit"
          disabled={pendente}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
        >
          {pendente ? "Salvando…" : "Salvar"}
        </button>
      </form>
      {estado?.error && (
        <p role="alert" className="mt-2 text-xs font-medium text-danger">
          {estado.error}
        </p>
      )}
      {estado?.ok && (
        <p role="status" className="mt-2 text-xs font-medium text-ok">
          {estado.ok}
        </p>
      )}
    </div>
  );
}
