"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mandarApresentacao } from "./actions";
import { cardClass } from "@/components/painel/ui";

/*
 * "Ele respondeu no meu celular e o agente não mandou a apresentação."
 *
 * A escuta do agente é automática, mas depende de um navegador conseguir
 * abrir a conversa numa VPS que às vezes engasga. Quando ela falha, o dono
 * fica olhando a resposta no celular sem nada acontecer — e é justamente o
 * momento mais quente do funil.
 *
 * Este card é a saída manual: lista quem recebeu o gancho e ainda não
 * recebeu a apresentação, com um botão por lead. Ele viu a resposta, ele
 * manda. A apresentação entra na MESMA faixa de prioridade da automática
 * (fura limite do dia, intervalo e horário), então sai em instantes.
 */

export type EsperandoApresentacao = {
  prospectoId: string;
  nome: string;
  telefone: string;
  enviadaEm: string | null;
  /* O robô da empresa já respondeu (não conta como gente). */
  robo: boolean;
};

function haQuanto(iso: string | null): string {
  if (!iso) return "";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `há ${h}h` : `há ${Math.round(h / 24)}d`;
}

export default function ApresentacaoManual({ leads }: { leads: EsperandoApresentacao[] }) {
  const router = useRouter();
  const [indo, iniciar] = useTransition();
  const [feitos, setFeitos] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);

  if (leads.length === 0) return null;
  const visiveis = aberto ? leads : leads.slice(0, 6);

  function mandar(id: string) {
    setErro(null);
    iniciar(async () => {
      const r = await mandarApresentacao(id);
      if (r?.error) setErro(r.error);
      else setFeitos((f) => ({ ...f, [id]: r?.ok ?? "Na fila." }));
      router.refresh();
    });
  }

  return (
    <section className={`anim-entrada d2 ${cardClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">👋 Responderam? Mande a apresentação</h2>
          <p className="mt-1 text-sm text-paper-dim">
            Estes receberam o gancho e ainda não receberam a apresentação. Se você viu a resposta no
            seu celular e o agente não reagiu, mande daqui — sai na frente da fila, sem gastar vaga do
            dia.
          </p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-paper-dim">
          {leads.length} aguardando
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        {visiveis.map((l) => {
          const pronto = feitos[l.prospectoId];
          return (
            <div
              key={l.prospectoId}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/10 px-3 py-2 text-sm"
            >
              <span className="font-bold text-paper">{l.nome}</span>
              <span className="text-xs text-paper-dim">{l.telefone}</span>
              {l.enviadaEm && <span className="text-xs text-paper-dim">gancho {haQuanto(l.enviadaEm)}</span>}
              {l.robo && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-paper-dim">
                  🤖 respondeu o robô
                </span>
              )}
              <div className="ml-auto flex items-center gap-2">
                <a
                  href={`https://wa.me/${l.telefone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-paper-dim underline-offset-2 hover:text-paper hover:underline"
                >
                  abrir conversa
                </a>
                {pronto ? (
                  <span className="text-xs font-bold text-ok">✅ na fila</span>
                ) : (
                  <button
                    type="button"
                    disabled={indo}
                    onClick={() => mandar(l.prospectoId)}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-paper-dim transition hover:border-brand-2 hover:text-brand-2 disabled:opacity-50"
                  >
                    Mandar apresentação
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {leads.length > 6 && (
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          className="mt-2 text-xs text-paper-dim underline-offset-2 hover:text-paper hover:underline"
        >
          {aberto ? "mostrar menos" : `ver os outros ${leads.length - 6}`}
        </button>
      )}

      {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
      <p className="mt-3 text-[11px] text-paper-dim">
        Mandar daqui também marca o gancho como respondido: o agente para de vigiar aquele número e o
        remarketing não cai em cima de quem já está conversando com você.
      </p>
    </section>
  );
}
