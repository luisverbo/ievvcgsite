"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mudarStatus } from "../actions";
import RespostasProntas from "../RespostasProntas";
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
  lembrete: string | null;
  resposta: string | null;
};

/*
 * Cada coluna tem uma COR, e ela conta a história do funil sozinha:
 * azul (novo) → âmbar (esperando) → roxo (conversando) → verde (dinheiro).
 * O card herda a cor da coluna onde está — arrastou, mudou de cor, e o
 * quadro se lê de longe sem ler uma palavra.
 */
const COLUNAS: { chave: StatusProspecto; rotulo: string; emoji: string; cor: string; dica: string }[] = [
  { chave: "novo", rotulo: "Novos", emoji: "✨", cor: "#4285f4", dica: "encontrados, ninguém falou ainda" },
  { chave: "contactado", rotulo: "Contactados", emoji: "📤", cor: "#f9ab00", dica: "mensagem enviada, aguardando" },
  { chave: "respondeu", rotulo: "Responderam", emoji: "💬", cor: "#9334e6", dica: "a conversa é sua agora" },
  { chave: "fechou", rotulo: "Fechados", emoji: "🏆", cor: "#188038", dica: "virou cliente!" },
  { chave: "descartado", rotulo: "Descartados", emoji: "🗄️", cor: "#80868b", dica: "fora do jogo, sem apagar" },
];

function linkZap(telefone: string | null): string | null {
  const d = (telefone ?? "").replace(/\D/g, "");
  if (d.length < 10) return null;
  return `https://wa.me/${d.startsWith("55") ? d : `55${d}`}`;
}

export default function Funil({
  leads,
  respostasRapidas = [],
  hojeBr,
}: {
  leads: LeadFunil[];
  respostasRapidas?: { t: string; x: string }[];
  /* O "hoje" de Brasília, calculado no servidor: quadro não olha relógio no
     meio do desenho, e assim a data não muda entre uma renderização e outra. */
  hojeBr: string;
}) {
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
    // Lembrete vencido sobe para o topo da coluna — é para isso que ele existe.
    const venceu = (l: LeadFunil) => !!l.lembrete && l.lembrete <= hojeBr;
    for (const l of otimista) mapa.get(l.status)?.push(l);
    for (const c of COLUNAS) {
      const cards = mapa.get(c.chave)!;
      mapa.set(c.chave, [...cards.filter(venceu), ...cards.filter((l) => !venceu(l))]);
    }
    return mapa;
  }, [otimista, hojeBr]);

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
        <p className="mx-auto mb-3 max-w-2xl rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-center text-xs font-bold text-warn">
          ⚠️ A última mudança não foi salva (falha de conexão) — o card voltou para onde estava.
          Tente de novo.
        </p>
      )}

      {/*
        O resumo do funil: os números de cada estágio, ligados por setas.
        É a leitura de 2 segundos que um CRM profissional dá — quantos
        entraram, quantos conversam, quantos fecharam.
      */}
      <div className="mx-auto mb-4 flex w-max max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl border border-white/10 bg-ink-2 px-4 py-2.5">
        {COLUNAS.filter((c) => c.chave !== "descartado").map((c, i) => (
          <span key={c.chave} className="flex items-center gap-2">
            {i > 0 && <span className="text-paper-dim/40">→</span>}
            <span className="flex items-center gap-1.5 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.cor }} />
              <b className="tabular-nums" style={{ color: c.cor }}>
                {(porColuna.get(c.chave) ?? []).length}
              </b>
              <span className="text-paper-dim">{c.rotulo.toLowerCase()}</span>
            </span>
          </span>
        ))}
      </div>

      {/* mx-auto: em tela larga o quadro fica CENTRADO; em tela estreita a
          rolagem horizontal continua funcionando normalmente. */}
      <div className="mx-auto flex w-max gap-4">
        {COLUNAS.map((col) => {
          const cards = porColuna.get(col.chave) ?? [];
          const pairando = alvo === col.chave;
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
              className="w-72 flex-none overflow-hidden rounded-2xl border transition-all"
              style={{
                borderColor: pairando ? col.cor : `${col.cor}44`,
                background: pairando ? `${col.cor}1e` : `${col.cor}0d`,
                boxShadow: pairando ? `0 0 0 3px ${col.cor}33, 0 18px 44px -24px ${col.cor}88` : undefined,
              }}
            >
              {/* a faixa de identidade da coluna */}
              <div className="h-1.5 w-full" style={{ background: col.cor }} />
              <div className="px-3.5 py-3" style={{ background: `${col.cor}14` }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-extrabold text-paper">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-base"
                      style={{ background: `${col.cor}26` }}
                    >
                      {col.emoji}
                    </span>
                    {col.rotulo}
                  </span>
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-extrabold tabular-nums text-white"
                    style={{ background: col.cor }}
                  >
                    {cards.length}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-paper-dim">{col.dica}</p>
              </div>

              <div className="flex max-h-[62vh] flex-col gap-2 overflow-y-auto p-2.5">
                {cards.length === 0 && (
                  <p
                    className="rounded-xl border border-dashed p-4 text-center text-xs text-paper-dim/60"
                    style={{ borderColor: `${col.cor}55` }}
                  >
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
                      className="group cursor-grab rounded-xl bg-ink-2 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg active:cursor-grabbing"
                      style={{
                        // O card veste a cor da coluna: mudou de coluna, mudou
                        // de cor — o estado se lê sem ler.
                        borderLeft: `4px solid ${col.cor}`,
                        border: `1px solid ${col.cor}33`,
                        borderLeftWidth: 4,
                        borderLeftColor: col.cor,
                      }}
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

                      <div className="flex flex-wrap gap-1">
                        {l.lembrete && (
                          <span
                            className={`mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                              l.lembrete <= hojeBr
                                ? "anim-pulso-ok border-danger/60 bg-danger/15 text-danger"
                                : "border-brand-2/40 bg-brand/10 text-brand-2"
                            }`}
                          >
                            ⏰{" "}
                            {l.lembrete <= hojeBr
                              ? "hoje!"
                              : new Date(`${l.lembrete}T12:00:00`).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                })}
                          </span>
                        )}
                        {l.etiqueta && (
                          <span className="mt-1.5 inline-block rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-[10px] font-bold text-warn">
                            🏷️ {l.etiqueta}
                          </span>
                        )}
                      </div>
                      {l.resposta && (
                        <>
                          <p className="mt-1.5 line-clamp-2 rounded-lg bg-ok/10 px-2 py-1.5 text-[11px] italic text-paper">
                            “{l.resposta}”
                          </p>
                          <RespostasProntas respostas={respostasRapidas} empresa={l.nome} />
                        </>
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
                              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[11px] font-bold text-paper-dim transition hover:bg-white/10 hover:text-paper"
                            >
                              <span className="h-2 w-2 rounded-full" style={{ background: c.cor }} />
                              {c.emoji} {c.rotulo}
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
