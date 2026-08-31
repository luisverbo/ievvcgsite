"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mudarStatus } from "../actions";
import type { StatusProspecto } from "@/lib/prospeccao/tipos";

/*
 * O quadro Kanban, sem biblioteca nenhuma.
 *
 * Arrastar usa a API nativa do navegador (draggable + onDrop): para cinco
 * colunas e cards simples ela dá conta, pesa zero e não traz dependência
 * para auditar. No celular, onde arrastar é ruim, cada card vira um menu de
 * "mover para" — dois toques fazem o mesmo trabalho.
 *
 * A mudança é OTIMISTA: o card muda de coluna na hora e o servidor confirma
 * atrás (useOptimistic + mudarStatus). Errou? A revalidação devolve o card —
 * mas o normal é o vendedor arrastar dez seguidos, e esperar o servidor a
 * cada um mataria a fluidez que faz um Kanban valer a pena.
 */

export type LeadFunil = {
  id: string;
  nome: string;
  telefone: string | null;
  categoria: string | null;
  avaliacoes: number | null;
  nota: number | null;
  etiqueta: string | null;
  status: StatusProspecto;
  local: string | null;
  resposta: string | null;
};

const COLUNAS: { chave: StatusProspecto; rotulo: string; cor: string; dica: string }[] = [
  { chave: "novo", rotulo: "🆕 Novos", cor: "#8ab4f8", dica: "encontrados, ninguém falou ainda" },
  { chave: "contactado", rotulo: "📤 Contactados", cor: "#fbbc05", dica: "mensagem enviada, aguardando" },
  { chave: "respondeu", rotulo: "💬 Responderam", cor: "#34a853", dica: "a conversa é sua agora" },
  { chave: "fechou", rotulo: "🤝 Fechados", cor: "#25d366", dica: "virou cliente!" },
  { chave: "descartado", rotulo: "🗄️ Descartados", cor: "#9aa2b1", dica: "fora do jogo, sem apagar" },
];

function linkZap(telefone: string | null): string | null {
  const d = (telefone ?? "").replace(/\D/g, "");
  if (d.length < 10) return null;
  return `https://wa.me/${d.startsWith("55") ? d : `55${d}`}`;
}

export default function Funil({ leads }: { leads: LeadFunil[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [erro, setErro] = useState(false);
  const [otimista, mover] = useOptimistic(
    leads,
    (atual, { id, status }: { id: string; status: StatusProspecto }) =>
      atual.map((l) => (l.id === id ? { ...l, status } : l)),
  );
  // Sobre qual coluna o arrasto está pairando (para acender a borda).
  const [alvo, setAlvo] = useState<StatusProspecto | null>(null);
  // Card com o menu "mover para" aberto (o caminho do toque, sem arrasto).
  const [menuDe, setMenuDe] = useState<string | null>(null);

  const porColuna = useMemo(() => {
    const mapa = new Map<StatusProspecto, LeadFunil[]>();
    for (const c of COLUNAS) mapa.set(c.chave, []);
    for (const l of otimista) mapa.get(l.status)?.push(l);
    return mapa;
  }, [otimista]);

  function soltar(id: string, status: StatusProspecto) {
    setAlvo(null);
    setMenuDe(null);
    const lead = otimista.find((l) => l.id === id);
    if (!lead || lead.status === status) return;
    startTransition(async () => {
      mover({ id, status });
      try {
        await mudarStatus(id, status);
      } catch {
        /*
         * Rede falhou no meio do arrasto: sem este catch, a exceção subiria
         * até o error boundary e derrubaria o QUADRO INTEIRO por causa de um
         * card. Aqui o refresh devolve a verdade do servidor (o card volta) e
         * um aviso discreto explica o porquê.
         */
        setErro(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="anim-entrada d1 -mx-6 overflow-x-auto px-6 pb-4">
      {erro && (
        <p className="mb-3 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs font-bold text-warn">
          ⚠️ A última mudança não foi salva (falha de conexão) — o card voltou para onde estava.
          Tente de novo.
        </p>
      )}
      <div className="flex min-w-max gap-3">
        {COLUNAS.map((col) => {
          const cards = porColuna.get(col.chave) ?? [];
          return (
            <div
              key={col.chave}
              onDragOver={(e) => {
                e.preventDefault();
                setAlvo(col.chave);
              }}
              onDragLeave={() => setAlvo((a) => (a === col.chave ? null : a))}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                if (id) soltar(id, col.chave);
              }}
              className={`w-72 flex-none rounded-2xl border bg-ink-2/60 transition ${
                alvo === col.chave ? "border-brand-2/70 bg-brand/10" : "border-white/10"
              }`}
            >
              <div className="sticky top-0 rounded-t-2xl border-b border-white/10 bg-ink-2 px-3.5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold text-paper">{col.rotulo}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-bold tabular-nums"
                    style={{ background: `${col.cor}22`, color: col.cor }}
                  >
                    {cards.length}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-paper-dim">{col.dica}</p>
              </div>

              <div className="flex max-h-[65vh] flex-col gap-2 overflow-y-auto p-2.5">
                {cards.length === 0 && (
                  <p className="rounded-lg border border-dashed border-white/10 p-3 text-center text-xs text-paper-dim/60">
                    solte um card aqui
                  </p>
                )}
                {cards.map((l) => {
                  const zap = linkZap(l.telefone);
                  return (
                    <div
                      key={l.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", l.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className="group cursor-grab rounded-xl border border-white/10 bg-ink-2 p-3 shadow-sm transition hover:border-brand-2/50 active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm font-bold text-paper">
                          {l.nome}
                        </p>
                        {l.nota != null && (
                          <span className="flex-none text-xs font-bold text-warn">
                            {String(l.nota).replace(".", ",")}★
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-paper-dim">
                        {[l.categoria, l.local].filter(Boolean).join(" · ") || "—"}
                        {l.avaliacoes ? ` · ${l.avaliacoes} aval.` : ""}
                      </p>

                      {l.etiqueta && (
                        <span className="mt-1.5 inline-block rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-[10px] font-bold text-warn">
                          🏷️ {l.etiqueta}
                        </span>
                      )}
                      {l.resposta && (
                        <p className="mt-1.5 line-clamp-2 rounded-lg bg-ok/10 px-2 py-1.5 text-[11px] italic text-paper">
                          “{l.resposta}”
                        </p>
                      )}

                      <div className="mt-2 flex items-center gap-1.5">
                        {zap && (
                          <a
                            href={zap}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md border border-ok/40 px-2 py-1 text-[11px] font-bold text-ok transition hover:bg-ok/10"
                          >
                            WhatsApp
                          </a>
                        )}
                        {/* Mover sem arrastar — o caminho do celular. */}
                        <button
                          type="button"
                          onClick={() => setMenuDe((m) => (m === l.id ? null : l.id))}
                          className="ml-auto rounded-md border border-white/10 px-2 py-1 text-[11px] font-bold text-paper-dim transition hover:border-brand-2/50 hover:text-brand-2"
                        >
                          mover ▾
                        </button>
                      </div>
                      {menuDe === l.id && (
                        <div className="mt-1.5 flex flex-col gap-1 rounded-lg border border-white/15 bg-ink p-1.5">
                          {COLUNAS.filter((c) => c.chave !== l.status).map((c) => (
                            <button
                              key={c.chave}
                              type="button"
                              onClick={() => soltar(l.id, c.chave)}
                              className="rounded-md px-2 py-1.5 text-left text-[11px] font-bold text-paper-dim transition hover:bg-white/10 hover:text-paper"
                            >
                              → {c.rotulo}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
