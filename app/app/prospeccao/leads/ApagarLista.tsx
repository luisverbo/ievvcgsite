"use client";

import { useActionState } from "react";
import { apagarLista } from "../actions";
import type { BuscaState } from "../actions";
import { inputClass } from "@/components/painel/ui";

/*
 * Apagar empresas da lista, em lote.
 *
 * Fica atrás de um <details> e pede o NÚMERO digitado à mão antes de apagar.
 * Não é burocracia: um "tem certeza?" a gente clica sem ler, e aqui não há
 * desfazer — some a empresa e, junto com ela, o histórico de que você já
 * falou com aquele número.
 *
 * O que sai é exatamente o que está filtrado na tela: se a pessoa filtrou
 * "Corretora de seguros · Rio de Janeiro", apaga aquilo; sem filtro, apaga
 * a lista inteira. O texto do botão sempre diz qual dos dois é.
 */
export default function ApagarLista({
  total,
  rotulo,
  f,
  b,
  q,
  tag,
}: {
  total: number;
  /* O que está filtrado agora, por extenso ("todas as empresas", "Dentista · Barra"). */
  rotulo: string;
  f: string;
  b: string;
  q?: string;
  tag?: string;
}) {
  const [estado, apagar, apagando] = useActionState<BuscaState, FormData>(apagarLista, undefined);

  return (
    <details className="group">
      <summary className="cursor-pointer list-none rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-paper-dim transition hover:border-danger hover:text-danger [&::-webkit-details-marker]:hidden">
        🗑️ Apagar
      </summary>
      <form
        action={apagar}
        className="mt-2 rounded-xl border border-danger/40 bg-danger/5 p-4 text-sm"
      >
        <input type="hidden" name="f" value={f} />
        <input type="hidden" name="b" value={b} />
        <input type="hidden" name="q" value={q ?? ""} />
        <input type="hidden" name="tag" value={tag ?? ""} />

        <p className="font-bold text-danger">
          Apagar {total} {total === 1 ? "empresa" : "empresas"} — {rotulo}
        </p>
        <p className="mt-1 text-xs text-paper-dim">
          Some da lista, do funil e do histórico de mensagens. <b className="text-paper">Não tem
          desfazer</b>, e como o registro de “já abordei” vai junto, uma busca futura pode trazer
          essas empresas de novo como novas.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-xs text-paper-dim" htmlFor="quantas">
            Digite <b className="text-paper">{total}</b> para confirmar:
          </label>
          <input
            id="quantas"
            name="quantas"
            type="number"
            inputMode="numeric"
            placeholder={String(total)}
            className={`${inputClass} w-24`}
          />
          <button
            type="submit"
            disabled={apagando}
            className="rounded-lg bg-danger px-4 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {apagando ? "Apagando…" : "Apagar agora"}
          </button>
        </div>

        {estado?.error && <p className="mt-2 text-xs text-danger">{estado.error}</p>}
        {estado?.ok && <p className="mt-2 text-xs text-ok">✅ {estado.ok}</p>}
      </form>
    </details>
  );
}
