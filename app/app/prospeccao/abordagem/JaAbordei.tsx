"use client";

import { useActionState, useMemo, useState } from "react";
import { prepararAbordagem, type EstadoAbordagem } from "./actions";
import { acharNicho } from "@/lib/prospeccao/nichos";
import { inputClass, labelClass, cardClass } from "@/components/painel/ui";
import SeletorNicho from "./SeletorNicho";

/*
 * JÁ ABORDEI — e o reenvio.
 *
 * Antes, empresa abordada sumia da tela: a lista "Quem abordar" só mostra
 * quem nunca recebeu mensagem, e não havia caminho de volta. Quem não
 * respondeu ficava fora do alcance, a não ser pela cadência automática de
 * remarketing (que tem prazo e limite próprios).
 *
 * Aqui elas continuam visíveis, com quando foi o último toque e quantos já
 * foram — e daqui sai o reenvio: outro texto, escrito para este lote, e
 * opcionalmente por um número específico.
 *
 * Duas travas que ficam de pé, e não passam por esta tela: quem pediu para
 * não receber (nao_perturbar) nem aparece na lista, e o limite diário de
 * cada linha continua valendo.
 */

export type JaAbordado = {
  id: string;
  nome: string;
  telefone: string | null;
  status: "novo" | "contactado" | "respondeu" | "fechou" | "descartado";
  nicho: string | null;
  local: string | null;
  enviadaEm: string | null;
  /* Quantas mensagens de abordagem/gancho/reenvio já saíram para esta empresa. */
  toques: number;
  /* Já tem mensagem esperando na fila: não entra num reenvio novo. */
  naFila: boolean;
};

const ROTULO_STATUS: Record<JaAbordado["status"], { texto: string; classe: string }> = {
  novo: { texto: "novo", classe: "bg-white/10 text-paper-dim" },
  contactado: { texto: "sem resposta", classe: "bg-warn/15 text-warn" },
  respondeu: { texto: "respondeu", classe: "bg-ok/15 text-ok" },
  fechou: { texto: "fechou", classe: "bg-ok/25 text-ok" },
  descartado: { texto: "descartado", classe: "bg-white/10 text-paper-dim" },
};

function quando(iso: string | null): string {
  if (!iso) return "";
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function JaAbordei({
  leads,
  modeloPadrao,
  linhas,
}: {
  leads: JaAbordado[];
  /* Texto que já vem escrito na caixa — o dono ajusta para este lote. */
  modeloPadrao: string;
  /* Os números conectados, para escolher por qual sai. */
  linhas: { id: string; nome: string; conectada: boolean }[];
}) {
  const [estado, enviar, enviando] = useActionState<EstadoAbordagem, FormData>(
    prepararAbordagem,
    undefined,
  );
  const [aberto, setAberto] = useState(false);
  const [pesquisa, setPesquisa] = useState("todas");
  const [soSemResposta, setSoSemResposta] = useState(true);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  const pesquisas = useMemo(() => {
    const mapa = new Map<string, { chave: string; rotulo: string; total: number }>();
    for (const l of leads) {
      const chave = `${l.nicho ?? ""}|${l.local ?? ""}`;
      const atual = mapa.get(chave);
      if (atual) atual.total++;
      else {
        const nicho = acharNicho(l.nicho ?? "")?.rotulo ?? l.nicho ?? "Sem nicho";
        mapa.set(chave, { chave, rotulo: l.local ? `${nicho} · ${l.local}` : nicho, total: 1 });
      }
    }
    return [...mapa.values()].sort((a, b) => b.total - a.total);
  }, [leads]);

  const visiveis = useMemo(
    () =>
      leads.filter((l) => {
        if (pesquisa !== "todas" && `${l.nicho ?? ""}|${l.local ?? ""}` !== pesquisa) return false;
        // O caso normal do reenvio é insistir com quem não respondeu; quem
        // respondeu já é conversa sua, e cutucar por robô só atrapalha.
        if (soSemResposta && l.status !== "contactado") return false;
        return true;
      }),
    [leads, pesquisa, soSemResposta],
  );

  const selecionaveis = visiveis.filter((l) => !l.naFila);

  function alternar(id: string) {
    setMarcados((s) => {
      const novo = new Set(s);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  if (leads.length === 0) return null;

  return (
    <div className={`anim-entrada d3 ${cardClass}`}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="text-lg font-bold">📮 Já abordei ({leads.length})</span>
          <span className="mt-0.5 block text-sm text-paper-dim">
            As empresas que já receberam mensagem. Daqui você fala de novo com quem não respondeu —
            com outro texto e, se quiser, por outro número.
          </span>
        </span>
        <span className={`flex-none text-sm font-bold text-paper-dim transition ${aberto ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {aberto && (
        <form action={enviar} className="mt-4">
          <input type="hidden" name="reenvio" value="1" />

          {pesquisas.length > 1 && (
            <SeletorNicho
              itens={pesquisas}
              valor={pesquisa}
              total={leads.length}
              aoEscolher={(chave) => {
                setPesquisa(chave);
                setMarcados(new Set());
              }}
            />
          )}

          <div className="mb-2 flex flex-wrap items-center gap-3 text-xs">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={soSemResposta}
                onChange={(e) => {
                  setSoSemResposta(e.target.checked);
                  setMarcados(new Set());
                }}
                className="h-4 w-4 accent-[var(--color-brand)]"
              />
              <span className="text-paper-dim">Só quem não respondeu</span>
            </label>
            <button
              type="button"
              onClick={() => setMarcados(new Set(selecionaveis.map((l) => l.id)))}
              className="text-paper-dim underline transition hover:text-paper"
            >
              marcar as {selecionaveis.length} desta lista
            </button>
            {marcados.size > 0 && (
              <button
                type="button"
                onClick={() => setMarcados(new Set())}
                className="text-paper-dim underline transition hover:text-paper"
              >
                limpar seleção
              </button>
            )}
          </div>

          <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
            {visiveis.length === 0 && (
              <p className="text-sm text-paper-dim">
                Ninguém nesta lista com o filtro atual.
              </p>
            )}
            {visiveis.map((l) => {
              const st = ROTULO_STATUS[l.status];
              return (
                <label
                  key={l.id}
                  className={`flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2 transition ${
                    l.naFila ? "opacity-50" : "cursor-pointer hover:border-white/25"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="prospecto"
                    value={l.id}
                    checked={marcados.has(l.id)}
                    disabled={l.naFila}
                    onChange={() => alternar(l.id)}
                    className="h-4 w-4 flex-none accent-[var(--color-brand)]"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{l.nome}</span>
                  <span className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-bold ${st.classe}`}>
                    {st.texto}
                  </span>
                  {l.toques > 1 && (
                    <span className="flex-none text-[10px] text-paper-dim">{l.toques} toques</span>
                  )}
                  <span className="flex-none text-xs text-paper-dim">
                    {l.naFila ? "na fila" : quando(l.enviadaEm)}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="mt-4">
            <label className={labelClass} htmlFor="texto_reenvio">
              A mensagem deste reenvio
            </label>
            <textarea
              id="texto_reenvio"
              name="texto_reenvio"
              defaultValue={modeloPadrao}
              rows={7}
              className={`${inputClass} mt-1 w-full resize-y font-mono text-xs`}
            />
            <p className="mt-1 text-[11px] text-paper-dim">
              Mesmas variáveis de sempre: <code className="text-paper">{"{empresa}"}</code>,{" "}
              <code className="text-paper">{"{meunome}"}</code>,{" "}
              <code className="text-paper">{"{bairro}"}</code>, e{" "}
              <code className="text-paper">[Oi|Olá]</code> para variar. Escreva como quem retoma
              uma conversa — a pessoa já recebeu uma mensagem sua antes.
            </p>
          </div>

          {linhas.length > 1 && (
            <div className="mt-3">
              <label className={labelClass} htmlFor="linha">
                Enviar por qual número
              </label>
              <select id="linha" name="linha" defaultValue="" className={`${inputClass} mt-1 w-full sm:w-72`}>
                <option value="">Qualquer um (revezando normalmente)</option>
                {linhas.map((l) => (
                  <option key={l.id} value={l.id} disabled={!l.conectada}>
                    {l.nome}
                    {l.conectada ? "" : " (desconectado)"}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-paper-dim">
                Escolhendo um número, estas mensagens ficam reservadas para ele — útil para falar de
                novo por um chip diferente do que abordou da primeira vez.
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-sm text-paper-dim">{marcados.size} selecionadas</span>
            <button
              type="submit"
              name="modo"
              value="semi"
              disabled={enviando || marcados.size === 0}
              className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-bold text-paper transition hover:border-white/40 disabled:opacity-50"
            >
              Preparar para eu enviar
            </button>
            <button
              type="submit"
              name="modo"
              value="auto"
              disabled={enviando || marcados.size === 0}
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-50"
            >
              {enviando ? "Enfileirando…" : "Enviar de novo"}
            </button>
          </div>
          {estado?.error && <p className="mt-2 text-sm text-danger">{estado.error}</p>}
          {estado?.ok && <p className="mt-2 text-sm text-ok">✅ {estado.ok}</p>}

          <p className="mt-3 rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-[11px] text-paper-dim">
            ⚠️ Insistir tem limite. Quem já levou dois ou três toques e não respondeu provavelmente
            não quer — e denúncia é o que derruba número. Quem pediu para não receber nem aparece
            nesta lista.
          </p>
        </form>
      )}
    </div>
  );
}
