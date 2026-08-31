"use client";

import { useActionState, useState } from "react";
import { enfileirarBuscaGoogle, type BuscaState } from "./actions";
import { NICHOS, GRUPOS_NICHOS } from "@/lib/prospeccao/nichos";
import { inputClass, labelClass, fieldClass } from "@/components/painel/ui";

export default function Busca({
  agenteAtivo,
  temAgente,
}: {
  agenteAtivo: boolean;
  temAgente: boolean;
}) {
  /*
   * Uma busca só: o Google Maps.
   *
   * O OpenStreetMap saiu da tela porque entregava pouco — cadastro
   * incompleto, sem avaliações e sem telefone na maioria — e duas opções
   * lado a lado faziam o cliente escolher a pior metade das vezes. Uma
   * porta boa vale mais que duas, sendo uma ruim.
   */
  const [estado, acaoGoogle, pendente] = useActionState<BuscaState, FormData>(
    enfileirarBuscaGoogle,
    undefined,
  );

  // "outro" abre o campo livre: o Google acha qualquer ramo por texto.
  const [nichoEscolhido, setNichoEscolhido] = useState("dentista");
  const livre = nichoEscolhido === "__outro__";

  return (
    <form className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="nicho">
            Nicho
          </label>
          <select
            id="nicho"
            name="nicho"
            value={nichoEscolhido}
            onChange={(e) => setNichoEscolhido(e.target.value)}
            className={inputClass}
          >
            {GRUPOS_NICHOS.map((g) => (
              <optgroup key={g} label={g}>
                {NICHOS.filter((n) => n.grupo === g).map((n) => (
                  <option key={n.chave} value={n.chave}>
                    {n.rotulo}
                  </option>
                ))}
              </optgroup>
            ))}
            <optgroup label="Não achou?">
              <option value="__outro__">✏️ Outro — digitar o ramo</option>
            </optgroup>
          </select>
          {livre && (
            <input
              name="nicho_livre"
              autoFocus
              placeholder="ex.: loja de aquário, energia solar, coworking…"
              className={`${inputClass} mt-2`}
            />
          )}
        </div>

        <div className={fieldClass}>
          <label className={labelClass} htmlFor="local">
            Onde
          </label>
          <input
            id="local"
            name="local"
            placeholder="Barra da Tijuca, Rio de Janeiro"
            className={inputClass}
            required
          />
        </div>

        <div className={fieldClass}>
          <label className={labelClass} htmlFor="limite">
            Máximo
          </label>
          <input
            id="limite"
            name="limite"
            type="number"
            min={5}
            max={60}
            defaultValue={20}
            className={`${inputClass} w-24`}
          />
        </div>
      </div>

      <button
        type="submit"
        formAction={acaoGoogle}
        disabled={pendente}
        className="w-full rounded-xl bg-brand px-5 py-3.5 text-base font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
      >
        {pendente ? "Enfileirando…" : "🗺️ Buscar no Google Maps"}
      </button>
      <p className="-mt-1 text-xs text-paper-dim">
        O agente varre o Google Maps e traz nome, telefone, endereço e avaliações de cada empresa.
        Leva alguns minutos — pode fechar esta tela, a lista aparece aqui quando ficar pronta.
      </p>
      {!agenteAtivo && (
        <p className="rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
          {temAgente ? (
            <>
              ⚠️ Seu agente está desligado. A busca entra na fila e sai sozinha assim que você
              ligar o computador — ou clicar em{" "}
              <b className="font-mono">LIGAR-AGENTE</b> agora.
            </>
          ) : (
            <>
              ⚠️ Você ainda não instalou o agente — sem ele a busca não roda.{" "}
              <a href="/app/prospeccao/agente" className="font-bold underline">
                Instalar agora
              </a>
              .
            </>
          )}
        </p>
      )}
      {estado?.error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {estado.error}
        </p>
      )}
      {estado?.ok && (
        <p className="rounded-lg border border-ok/40 bg-ok/10 px-4 py-3 text-sm text-ok">
          ✅ {estado.ok}
        </p>
      )}
    </form>
  );
}
