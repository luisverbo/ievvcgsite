"use client";

import { useActionState, useState } from "react";
import { salvarHorarioEnvio, type EstadoAbordagem } from "./actions";
import { cardClass, labelClass } from "@/components/painel/ui";
import { descreverJanela, previsaoDeTermino, type Janela } from "@/lib/prospeccao/janela";

/*
 * O horário de envio.
 *
 * A fila não deveria virar a noite: quando o dia virava e ainda havia
 * mensagem esperando, o agente recomeçava à meia-noite. Aqui a pessoa diz em
 * que horas e em que dias o agente pode mandar — e vê, na hora, o que isso
 * significa para a fila de hoje.
 *
 * O que fura a janela, e a tela avisa: a apresentação (resposta a quem
 * acabou de responder) e o teste de envio. O aquecimento usa a mesma janela.
 */

const DIAS = [
  { n: 1, r: "seg" },
  { n: 2, r: "ter" },
  { n: 3, r: "qua" },
  { n: 4, r: "qui" },
  { n: 5, r: "sex" },
  { n: 6, r: "sáb" },
  { n: 0, r: "dom" },
];

export default function HorarioEnvio({
  janela,
  disponivel,
  aberta,
  retomaEm,
  naFila,
  porDia,
  agora,
}: {
  janela: Janela;
  /* false = migração 2026-09-16 pendente: a tela mostra, o servidor não aplica. */
  disponivel: boolean;
  aberta: boolean;
  /* "hoje às 08:00", "amanhã às 06:00", "seg às 08:00" (calculado no servidor). */
  retomaEm: string;
  naFila: number;
  /* limite diário × linhas ativas */
  porDia: number;
  /* Date.now() do servidor: as previsões ao vivo partem dele. */
  agora: number;
}) {
  const [estado, salvar, salvando] = useActionState<EstadoAbordagem, FormData>(salvarHorarioEnvio, undefined);
  const [inicio, setInicio] = useState(janela.inicio);
  const [fim, setFim] = useState(janela.fim);
  const [dias, setDias] = useState<number[]>(janela.dias);

  const rascunho: Janela = { inicio, fim, dias };
  const valido = fim > inicio && dias.length > 0;
  const previsao = previsaoDeTermino(rascunho, naFila, porDia, agora);
  const horasPorDia = Math.max(0, fim - inicio);

  function alternarDia(n: number) {
    setDias((d) => (d.includes(n) ? d.filter((x) => x !== n) : [...d, n].sort()));
  }

  return (
    <section className={`anim-entrada d2 ${cardClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">🕒 Horário de envio</h2>
          <p className="mt-1 text-sm text-paper-dim">
            O agente só manda mensagem de prospecção dentro deste horário (Brasília). Fora dele a fila
            espera — e ele continua escutando quem responde.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            !disponivel ? "bg-white/10 text-paper-dim" : aberta ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn"
          }`}
        >
          {!disponivel ? "migração pendente" : aberta ? "enviando agora" : `fora do horário · retoma ${retomaEm}`}
        </span>
      </div>

      {!disponivel && (
        <p className="mt-3 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
          Rode a migração <b>2026-09-16_horario_envio.sql</b> no Supabase. Até lá o agente envia em
          qualquer hora, como antes.
        </p>
      )}

      <form action={salvar} className="mt-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className={labelClass}>Começa às</label>
            <select
              name="inicio"
              value={inicio}
              onChange={(e) => setInicio(Number(e.target.value))}
              className="mt-1 rounded-lg border border-white/15 bg-ink px-3 py-2 text-sm text-paper"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Para às</label>
            <select
              name="fim"
              value={fim}
              onChange={(e) => setFim(Number(e.target.value))}
              className="mt-1 rounded-lg border border-white/15 bg-ink px-3 py-2 text-sm text-paper"
            >
              {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>
                  {h === 24 ? "24:00" : `${String(h).padStart(2, "0")}:00`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Dias</label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {DIAS.map((d) => {
                const ligado = dias.includes(d.n);
                return (
                  <label
                    key={d.n}
                    className={`cursor-pointer select-none rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                      ligado ? "border-brand-2 bg-brand/15 text-paper" : "border-white/10 text-paper-dim hover:border-white/25"
                    }`}
                  >
                    <input type="checkbox" name="dias" value={d.n} checked={ligado} onChange={() => alternarDia(d.n)} className="sr-only" />
                    {d.r}
                  </label>
                );
              })}
            </div>
          </div>
          <button
            type="submit"
            disabled={salvando || !valido || !disponivel}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-50"
          >
            {salvando ? "Salvando…" : "Salvar horário"}
          </button>
        </div>

        {!valido && (
          <p className="text-xs text-danger">
            {fim <= inicio ? "A hora de parar precisa ser depois da de começar." : "Escolha pelo menos um dia."}
          </p>
        )}

        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-paper-dim">
          <p>
            <b className="text-paper">{descreverJanela(rascunho)}</b> · {horasPorDia}h de envio por dia
            {naFila > 0 && porDia > 0 && (
              <>
                {" "}
                · com <b className="text-paper">{naFila}</b> na fila e até <b className="text-paper">{porDia}</b> por dia, a fila termina em{" "}
                <b className="text-paper">
                  {previsao.dias} dia{previsao.dias === 1 ? "" : "s"} de envio
                </b>
                {previsao.termina && (
                  <>
                    {" "}
                    ({previsao.termina.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })})
                  </>
                )}
              </>
            )}
          </p>
          <p className="mt-1">
            Fura o horário, de propósito: a <b className="text-paper">apresentação</b> para quem acabou de
            responder (gente responde na hora) e o <b className="text-paper">teste de envio</b>. O{" "}
            <b className="text-paper">aquecimento</b> das linhas usa este mesmo horário. O limite diário
            zera à meia-noite; o que sobrar da fila espera o próximo dia permitido.
          </p>
        </div>

        {estado?.ok && <p className="text-sm text-ok">✅ {estado.ok}</p>}
        {estado?.error && <p className="text-sm text-danger">{estado.error}</p>}
      </form>
    </section>
  );
}
