"use client";

import { useState } from "react";
import { salvarTemaPagina } from "../../actions";
import { PRESETS_TEMA, COR_LABELS, CORES_PADRAO, FONTES_TITULO, type CorKey } from "@/lib/theme";
import type { Tema } from "@/lib/types";
import { IconCheck, IconX } from "@/components/painel/icons";

// Cores e fontes só desta página. Vazio = herda tudo do site.
const CORES_VISIVEIS: CorKey[] = [
  "night",
  "night2",
  "cream",
  "creamDim",
  "gold",
  "coral",
  "green",
];

export default function CoresPagina({
  paginaId,
  siteAdminId,
  temaSite,
  temaInicial,
  onFechar,
  onMudar,
  onSalvo,
}: {
  paginaId: string;
  siteAdminId: string;
  temaSite: Tema;
  temaInicial: Tema | null;
  onFechar: () => void; // cancelar (a prévia volta ao que estava salvo)
  onMudar: (tema: Tema | null) => void; // prévia ao vivo
  onSalvo: (tema: Tema | null) => void;
}) {
  const [tema, setTema] = useState<Tema | null>(temaInicial);
  const [salvando, setSalvando] = useState(false);

  const personalizado = Boolean(tema && Object.keys(tema).length > 0);
  // O que está valendo agora (para mostrar nos seletores).
  const corAtual = (k: CorKey) => tema?.cores?.[k] ?? temaSite.cores?.[k] ?? CORES_PADRAO[k];

  function aplicar(novo: Tema | null) {
    setTema(novo);
    onMudar(novo);
  }

  function usarPreset(chave: string) {
    if (chave === "") return aplicar(null); // herdar do site
    const preset = PRESETS_TEMA[chave];
    if (preset) aplicar({ ...(tema ?? {}), cores: { ...preset.cores } });
  }

  function mudarCor(k: CorKey, valor: string) {
    aplicar({ ...(tema ?? {}), cores: { ...(tema?.cores ?? temaSite.cores ?? {}), [k]: valor } });
  }

  async function salvar() {
    const final = personalizado ? tema : null;
    setSalvando(true);
    await salvarTemaPagina(paginaId, siteAdminId, final);
    setSalvando(false);
    onSalvo(final);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onFechar}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-none items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-extrabold">🎨 Cores desta página</h2>
            <p className="text-xs text-paper-dim">
              Por padrão herda do site. Personalize só se quiser.
            </p>
          </div>
          <button
            onClick={onFechar}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-paper-dim transition hover:bg-white/10 hover:text-paper"
          >
            <IconX size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {!personalizado && (
            <p className="mb-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-paper-dim">
              Esta página está usando <b className="text-paper">as cores do site</b>. Escolha uma
              paleta abaixo para dar identidade própria a ela.
            </p>
          )}

          <label className="text-sm font-medium text-paper-dim">Paleta</label>
          <select
            className="mt-1.5 w-full rounded-lg border border-white/10 bg-ink px-4 py-2.5 text-sm text-paper outline-none focus-visible:border-brand-2"
            value=""
            onChange={(e) => usarPreset(e.target.value)}
          >
            <option value="" disabled>
              Escolher uma paleta pronta…
            </option>
            {Object.entries(PRESETS_TEMA).map(([chave, preset]) => (
              <option key={chave} value={chave}>
                {preset.label}
              </option>
            ))}
          </select>

          <div className="mt-5 grid gap-3">
            <span className="text-sm font-medium text-paper-dim">Ajuste fino</span>
            {CORES_VISIVEIS.map((k) => (
              <label key={k} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">{COR_LABELS[k]}</span>
                <span className="flex flex-none items-center gap-2">
                  <input
                    type="color"
                    value={corAtual(k)}
                    onChange={(e) => mudarCor(k, e.target.value)}
                    className="h-8 w-12 cursor-pointer rounded border border-white/15 bg-transparent"
                  />
                </span>
              </label>
            ))}
          </div>

          <div className="mt-5">
            <label className="text-sm font-medium text-paper-dim">Fonte dos títulos</label>
            <select
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-ink px-4 py-2.5 text-sm text-paper outline-none focus-visible:border-brand-2"
              value={tema?.fonte_titulo ?? ""}
              onChange={(e) =>
                aplicar({ ...(tema ?? {}), fonte_titulo: e.target.value || undefined })
              }
            >
              <option value="">Igual à do site</option>
              {Object.keys(FONTES_TITULO).map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {personalizado && (
            <button
              onClick={() => aplicar(null)}
              className="mt-5 w-full rounded-lg border border-white/15 py-2.5 text-sm font-bold text-paper-dim transition hover:border-danger hover:text-danger"
            >
              Voltar a usar as cores do site
            </button>
          )}
        </div>

        <div className="flex flex-none gap-2 border-t border-white/10 p-4">
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
          >
            {salvando ? "Salvando…" : (
              <>
                <IconCheck size={15} /> Salvar cores
              </>
            )}
          </button>
          <button
            onClick={onFechar}
            className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-bold text-paper transition hover:border-white/30"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
