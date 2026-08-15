"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { cancelarTarefa, limparTarefas } from "./actions";
import { ROTULO_TAREFA, type TarefaRow } from "@/lib/prospeccao/tipos";
import { acharNicho } from "@/lib/prospeccao/nichos";
import Robo from "@/components/painel/Robo";

const COR: Record<string, string> = {
  pendente: "text-paper-dim",
  rodando: "text-brand-2",
  concluida: "text-ok",
  erro: "text-danger",
  cancelada: "text-paper-dim",
};

export default function Fila({ tarefas }: { tarefas: TarefaRow[] }) {
  const router = useRouter();
  const ativa = tarefas.some((t) => t.status === "pendente" || t.status === "rodando");

  // Só fica atualizando enquanto há trabalho em andamento — parado, não faz
  // requisição nenhuma.
  useEffect(() => {
    if (!ativa) return;
    const id = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(id);
  }, [ativa, router]);

  if (tarefas.length === 0) return null;

  return (
    <div
      className={`anim-entrada d3 rounded-xl border bg-ink-2 p-4 ${
        ativa ? "border-brand-2/40" : "border-white/10"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          {ativa && <Robo estado="trabalhando" tamanho={30} />}
          Fila do agente{" "}
          {ativa && (
            <span className="text-brand-2">
              · trabalhando{" "}
              <span className="pp-pontinhos">
                <span />
                <span />
                <span />
              </span>
            </span>
          )}
        </h2>
        <form action={limparTarefas}>
          <button
            type="submit"
            className="text-xs text-paper-dim underline transition hover:text-paper"
          >
            limpar concluídas
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-2">
        {tarefas.map((t) => {
          const pct = t.total > 0 ? Math.round((t.progresso / t.total) * 100) : 0;
          return (
            <div key={t.id} className="rounded-lg border border-white/10 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="font-bold text-paper">
                  {t.tipo === "instagram"
                    ? "📸 Instagram"
                    : `${acharNicho(t.nicho ?? "")?.rotulo ?? t.nicho} · ${t.local}`}
                </span>
                <span className={`font-bold ${COR[t.status]}`}>{ROTULO_TAREFA[t.status]}</span>
                {t.status === "rodando" && t.total > 0 && (
                  <span className="text-paper-dim">
                    {t.progresso}/{t.total}
                  </span>
                )}
                {t.status === "concluida" && (
                  <span className="text-paper-dim">{t.gravadas} empresas</span>
                )}
                {t.agente && <span className="text-paper-dim">via {t.agente}</span>}
                <span className="ml-auto text-paper-dim">
                  {new Date(t.created_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {t.status === "pendente" && (
                  <form action={cancelarTarefa.bind(null, t.id)}>
                    <button
                      type="submit"
                      className="text-paper-dim underline transition hover:text-danger"
                    >
                      cancelar
                    </button>
                  </form>
                )}
              </div>

              {t.status === "rodando" && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  {/* gradiente correndo dentro da barra: dá para VER que anda */}
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(6, pct)}%`,
                      background:
                        "linear-gradient(90deg, #6c5ce7, #8e7bff, #ea5c93, #8e7bff, #6c5ce7)",
                      backgroundSize: "200% 100%",
                      animation: "pp-aurora 2.4s linear infinite",
                    }}
                  />
                </div>
              )}
              {t.erro && <p className="mt-1.5 text-xs text-danger">{t.erro}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
