"use client";

import { useActionState } from "react";
import { salvarTesteGratis, type TesteGratisState } from "./actions";
import { inputClass, labelClass, cardClass } from "@/components/painel/ui";

/*
 * O card do teste grátis no Admin: quantos dias, e os dois tetos por dia.
 *
 * É uma campanha, e campanha muda: 7 dias hoje, 14 na Black Friday. Aqui
 * muda sem deploy — a landing do teste, o cadastro, a faixa do painel e os
 * freios do servidor leem daqui.
 */
export default function TesteGratis({
  dias,
  empresas,
  envios,
  linkTeste,
}: {
  dias: number;
  empresas: number;
  envios: number;
  /* O link da campanha, já no domínio do Prospector. */
  linkTeste: string;
}) {
  const [estado, salvar, salvando] = useActionState<TesteGratisState, FormData>(
    salvarTesteGratis,
    undefined,
  );

  return (
    <form action={salvar} className={cardClass}>
      <h2 className="text-lg font-bold">🎁 Teste grátis do Prospector</h2>
      <p className="mt-1 text-sm text-paper-dim">
        Quem entra por{" "}
        <a href={linkTeste} target="_blank" rel="noreferrer" className="font-mono text-brand-2 hover:underline">
          {linkTeste}
        </a>{" "}
        cria a conta sem cartão e usa a prospecção inteira com estes limites. Mudou aqui, muda
        na landing, no cadastro e no painel de quem está testando — sem deploy. A duração vale
        para os testes que começarem depois de salvar.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor="teste_dias">
            Duração (dias)
          </label>
          <input
            id="teste_dias"
            name="dias"
            type="number"
            min={1}
            max={90}
            defaultValue={dias}
            className={`${inputClass} mt-1 w-full`}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="teste_empresas">
            Empresas por dia
          </label>
          <input
            id="teste_empresas"
            name="empresas"
            type="number"
            min={5}
            max={500}
            defaultValue={empresas}
            className={`${inputClass} mt-1 w-full`}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="teste_envios">
            Envios por dia
          </label>
          <input
            id="teste_envios"
            name="envios"
            type="number"
            min={5}
            max={200}
            defaultValue={envios}
            className={`${inputClass} mt-1 w-full`}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={salvando}
          className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
        >
          {salvando ? "Salvando…" : "Salvar teste grátis"}
        </button>
        {estado?.error && <p className="text-sm text-danger">{estado.error}</p>}
        {estado?.ok && <p className="text-sm text-ok">✅ {estado.ok}</p>}
      </div>
    </form>
  );
}
