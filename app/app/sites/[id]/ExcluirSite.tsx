"use client";

import { useState } from "react";
import { excluirSite } from "./actions";
import { IconTrash, IconX } from "@/components/painel/icons";

export default function ExcluirSite({ siteId, siteNome }: { siteId: string; siteNome: string }) {
  const [aberto, setAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [excluindo, setExcluindo] = useState(false);

  const podeExcluir = confirmacao.trim() === siteNome.trim();

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="flex w-fit items-center gap-2 rounded-lg border border-danger/40 px-4 py-2.5 text-sm font-bold text-danger transition hover:bg-danger/10"
      >
        <IconTrash size={15} /> Excluir este site
      </button>

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
              <h2 className="text-lg font-extrabold text-danger">Excluir site</h2>
              <button
                onClick={() => setAberto(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-paper-dim transition hover:bg-white/10 hover:text-paper"
              >
                <IconX size={16} />
              </button>
            </div>

            <p className="mb-4 text-sm text-paper-dim">
              Isso apaga <b className="text-paper">{siteNome}</b> para sempre — todas as páginas,
              blocos, leads e métricas. Essa ação <b className="text-paper">não pode ser desfeita</b>.
            </p>

            <label className="mb-1.5 block text-sm font-medium text-paper-dim">
              Digite <b className="text-paper">{siteNome}</b> para confirmar:
            </label>
            <input
              autoFocus
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              className="mb-4 w-full rounded-lg border border-white/10 bg-ink px-4 py-2.5 outline-none focus-visible:border-danger"
              placeholder={siteNome}
            />

            <div className="flex gap-2">
              <button
                disabled={!podeExcluir || excluindo}
                onClick={async () => {
                  setExcluindo(true);
                  await excluirSite(siteId);
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-danger py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {excluindo ? "Excluindo…" : "Excluir para sempre"}
              </button>
              <button
                onClick={() => setAberto(false)}
                className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-bold text-paper transition hover:border-white/30"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
