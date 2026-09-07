"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { configurarAquecimento, pararAquecimento, type EstadoAbordagem } from "./actions";
import { cardClass, inputClass, labelClass } from "@/components/painel/ui";

/*
 * Aquecimento das linhas.
 *
 * As linhas da conta conversam entre si (e num grupo, se o dono criou um com
 * todas) em ritmo de gente, nas horas de gente, por alguns dias — para um
 * número novo ou recém-restringido chegar na prospecção com histórico de
 * conversa comum, e não como um chip que só manda mensagem para estranho.
 *
 * O card é honesto sobre o efeito: ajuda, não garante. O WhatsApp olha muito
 * mais para quantos desconhecidos recebem mensagem e quantos respondem.
 */

type LinhaAquecimento = { nome: string; telefone: string | null; conectada: boolean };

export default function Aquecimento({
  ate,
  ligado,
  porHora,
  grupo,
  linhas,
  legado,
  trocasHoje,
}: {
  ate: string | null;
  /* Calculado no servidor: prazo no futuro. */
  ligado: boolean;
  porHora: number;
  grupo: string | null;
  linhas: LinhaAquecimento[];
  legado: boolean;
  trocasHoje: number;
}) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [estado, agir, salvando] = useActionState<EstadoAbordagem, FormData>(configurarAquecimento, undefined);
  const [paraEstado, parar, parando] = useActionState<EstadoAbordagem, FormData>(
    async () => pararAquecimento(),
    undefined,
  );

  const comNumero = linhas.filter((l) => (l.telefone ?? "").replace(/\D/g, "").length >= 10);
  const prontas = comNumero.filter((l) => l.conectada);
  const daParaAquecer = !legado && (comNumero.length >= 2 || (comNumero.length >= 1 && !!grupo));

  return (
    <section className={`anim-entrada d2 ${cardClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">🔥 Aquecimento das linhas</h2>
          <p className="mt-1 text-sm text-paper-dim">
            As suas linhas conversam entre si sozinhas, das 8h às 22h, em ritmo de gente. Serve para
            um número novo — ou um que o WhatsApp acabou de restringir — ganhar histórico de conversa
            comum antes de voltar a prospectar.
          </p>
        </div>
        {ligado ? (
          <span className="rounded-full bg-ok/15 px-3 py-1 text-xs font-bold text-ok">
            aquecendo até{" "}
            {new Date(ate ?? 0).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            {" · "}hoje {trocasHoje} troca{trocasHoje === 1 ? "" : "s"}
          </span>
        ) : (
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-paper-dim">desligado</span>
        )}
      </div>

      {legado ? (
        <p className="mt-3 text-xs text-paper-dim">
          Precisa da migração das linhas (2026-09-09) e da do aquecimento (2026-09-15) no Supabase.
        </p>
      ) : (
        <>
          <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-paper-dim">
            <p>
              <b className="text-paper">Como preparar:</b> informe o número de cada linha no card acima (é para
              ele que as outras mandam). Para conversar em grupo, crie no celular um grupo com todas as linhas e
              escreva aqui o nome exato dele.
            </p>
            <p className="mt-1">
              Linhas com número: <b className="text-paper">{comNumero.length}</b> · conectadas agora:{" "}
              <b className="text-paper">{prontas.length}</b>
              {!daParaAquecer && (
                <span className="text-warn"> — precisa de 2 linhas com número, ou 1 linha e um grupo.</span>
              )}
            </p>
            <p className="mt-1">
              O aquecimento continua mesmo com o envio pausado (é conversa entre os seus números, não
              prospecção) e não conta no limite do dia. Linha restringida pelo WhatsApp não participa até
              o prazo passar.
            </p>
          </div>

          {ligado ? (
            <form action={parar} className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-xs text-paper-dim">
                {porHora} troca{porHora > 1 ? "s" : ""} por hora
                {grupo ? (
                  <>
                    {" "}
                    · grupo <b className="text-paper">{grupo}</b>
                  </>
                ) : (
                  " · só entre as linhas"
                )}
              </p>
              <button
                type="submit"
                disabled={parando}
                onClick={() => iniciar(() => router.refresh())}
                className="rounded-lg border border-white/15 px-4 py-2 text-xs font-bold text-paper-dim hover:border-white/40 hover:text-paper disabled:opacity-50"
              >
                {parando ? "Desligando…" : "Desligar aquecimento"}
              </button>
              {paraEstado?.ok && <span className="text-xs text-ok">{paraEstado.ok}</span>}
              {paraEstado?.error && <span className="text-xs text-danger">{paraEstado.error}</span>}
            </form>
          ) : (
            <form action={agir} className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label className={labelClass}>Por quantos dias</label>
                <input name="dias" type="number" min={1} max={14} defaultValue={2} className={`${inputClass} mt-1 w-24`} />
              </div>
              <div>
                <label className={labelClass}>Trocas por hora</label>
                <input
                  name="por_hora"
                  type="number"
                  min={1}
                  max={12}
                  defaultValue={porHora}
                  className={`${inputClass} mt-1 w-24`}
                />
              </div>
              <div className="min-w-[220px] flex-1">
                <label className={labelClass}>Nome do grupo (opcional)</label>
                <input
                  name="grupo"
                  defaultValue={grupo ?? ""}
                  placeholder="ex.: Equipe"
                  className={`${inputClass} mt-1 w-full`}
                />
              </div>
              <button
                type="submit"
                disabled={salvando || !daParaAquecer}
                className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-ink hover:opacity-90 disabled:opacity-50"
              >
                {salvando ? "Ligando…" : "Ligar aquecimento"}
              </button>
              {estado?.ok && <span className="text-xs text-ok">{estado.ok}</span>}
              {estado?.error && <span className="text-xs text-danger">{estado.error}</span>}
            </form>
          )}

          <p className="mt-3 text-[11px] text-paper-dim">
            Sinceridade sobre o efeito: aquecer ajuda, não garante. O WhatsApp sabe que o WhatsApp Web
            é um “dispositivo conectado” e olha sobretudo para quantos desconhecidos recebem mensagem por
            dia e quantos respondem ou bloqueiam. O melhor aquecimento continua sendo usar o número de
            verdade no celular — conversas reais, grupos reais, foto e nome no perfil. Comece a
            prospecção com 10 a 15 por dia e suba devagar.
          </p>
        </>
      )}
    </section>
  );
}
