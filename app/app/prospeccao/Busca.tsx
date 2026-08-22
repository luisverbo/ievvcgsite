"use client";

import { useActionState, useState } from "react";
import { buscarProspectos, enfileirarBuscaGoogle, type BuscaState } from "./actions";
import { NICHOS, GRUPOS_NICHOS } from "@/lib/prospeccao/nichos";
import { inputClass, labelClass, fieldClass } from "@/components/painel/ui";

export default function Busca({
  agenteAtivo,
  temAgente,
}: {
  agenteAtivo: boolean;
  temAgente: boolean;
}) {
  const [osm, acaoOsm, pendenteOsm] = useActionState<BuscaState, FormData>(
    buscarProspectos,
    undefined,
  );
  const [google, acaoGoogle, pendenteGoogle] = useActionState<BuscaState, FormData>(
    enfileirarBuscaGoogle,
    undefined,
  );

  const pendente = pendenteOsm || pendenteGoogle;
  const estado = osm ?? google;

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

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="mb-1 font-bold">🗺️ Google Maps</p>
          <p className="mb-3 text-xs text-paper-dim">
            Resultado completo, com avaliações e nota. Roda no agente e leva alguns minutos.
          </p>
          <button
            type="submit"
            formAction={acaoGoogle}
            disabled={pendente}
            className="w-full rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
          >
            {pendenteGoogle ? "Enfileirando…" : "Buscar no Google"}
          </button>
          {!agenteAtivo && (
            <p className="mt-2 text-[11px] text-paper-dim">
              {temAgente ? (
                <>
                  ⚠️ Seu agente está desligado. A busca entra na fila e sai sozinha assim que você
                  clicar em <b className="font-mono text-paper">LIGAR-AGENTE</b> no seu computador.
                </>
              ) : (
                <>
                  ⚠️ Você ainda não instalou o agente — sem ele a busca no Google não roda.{" "}
                  <a href="/app/prospeccao/agente" className="underline">
                    Instalar agora
                  </a>
                  .
                </>
              )}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="mb-1 font-bold">🧭 OpenStreetMap</p>
          <p className="mb-3 text-xs text-paper-dim">
            Na hora, aqui mesmo. Gratuito e sem bloqueio, mas com menos cadastros e sem avaliações.
            {livre && (
              <>
                {" "}
                <b className="text-warn">Ramo digitado à mão só funciona no Google</b> — o mapa
                aberto precisa de categoria da lista.
              </>
            )}
          </p>
          <button
            type="submit"
            formAction={acaoOsm}
            disabled={pendente}
            className="w-full rounded-lg border border-white/15 px-5 py-2.5 text-sm font-bold text-paper transition hover:border-white/40 disabled:opacity-60"
          >
            {pendenteOsm ? "Buscando…" : "Buscar agora"}
          </button>
        </div>
      </div>

      {pendenteOsm && (
        <p className="text-sm text-brand-2">
          Procurando empresas e conferindo os sites de cada uma… leva alguns segundos.
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
