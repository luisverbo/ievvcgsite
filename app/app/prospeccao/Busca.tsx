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

      {/*
        Os filtros ficam recolhidos de propósito.
        Quem abre esta tela pela primeira vez precisa de três campos e um
        botão; quem já entendeu o produto é que vem afinar a lista. Aberto por
        padrão, isto viraria um formulário de seis perguntas antes da primeira
        busca — e a primeira busca é a que decide se a pessoa fica.
      */}
      <details className="rounded-xl border border-white/10 bg-ink-2/60 p-4">
        <summary className="cursor-pointer text-sm font-bold text-paper-dim transition hover:text-paper">
          ⚙️ Filtros — trazer só o tipo de empresa que você quer{" "}
          <span className="font-normal">(opcional)</span>
        </summary>

        <p className="mt-3 text-xs text-paper-dim">
          O agente abre <b className="text-paper">mais</b> empresas do que você pediu e vai
          descartando as que não passam, até completar o número do campo “Máximo”. Filtro apertado
          demais para o bairro? Ele avisa quantas ficaram de fora.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className={fieldClass}>
            <label className={labelClass} htmlFor="f_site">
              Site próprio
            </label>
            <select id="f_site" name="f_site" defaultValue="tanto_faz" className={inputClass}>
              <option value="tanto_faz">Tanto faz</option>
              <option value="sem">Só quem NÃO tem site</option>
              <option value="com">Só quem JÁ tem site</option>
            </select>
            <p className="mt-1 text-[11px] text-paper-dim">
              Sem site costuma ser negócio pequeno e mais acessível; com site, empresa mais
              estruturada.
            </p>
          </div>

          <div className={fieldClass}>
            <label className={labelClass} htmlFor="f_min_nota">
              Nota mínima no Google
            </label>
            <select id="f_min_nota" name="f_min_nota" defaultValue="0" className={inputClass}>
              <option value="0">Tanto faz</option>
              <option value="3.5">3,5 ou mais</option>
              <option value="4">4,0 ou mais</option>
              <option value="4.5">4,5 ou mais</option>
            </select>
            <p className="mt-1 text-[11px] text-paper-dim">
              Empresa bem avaliada é empresa que está vendendo — e quem vende, paga.
            </p>
          </div>

          <div className={fieldClass}>
            <label className={labelClass}>Avaliações no Google</label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-sm text-paper-dim">de</span>
              <input
                name="f_min_av"
                type="number"
                min={0}
                placeholder="0"
                className={`${inputClass} w-24`}
              />
              <span className="text-sm text-paper-dim">até</span>
              <input
                name="f_max_av"
                type="number"
                min={0}
                placeholder="sem teto"
                className={`${inputClass} w-28`}
              />
            </div>
            <p className="mt-1 text-[11px] text-paper-dim">
              O mínimo corta cadastro morto. O <b className="text-paper">máximo</b> é o filtro que
              quase ninguém lembra: acima de umas 300 avaliações você está falando com rede grande,
              que tem gerente e não responde WhatsApp de desconhecido.
            </p>
          </div>

          <div className={fieldClass}>
            <label className={labelClass}>Contato</label>
            <label className="mt-1 flex cursor-pointer items-start gap-2.5 rounded-lg border border-white/10 p-2.5 transition hover:border-white/25">
              <input type="checkbox" name="f_whatsapp" className="mt-0.5 flex-none accent-current" />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-paper">Só com WhatsApp</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-paper-dim">
                  Deixa de fora quem só tem telefone fixo — nesses o número não abre conversa. Ligue
                  quando for abordar pelo WhatsApp; deixe desligado quando também for telefonar.
                </span>
              </span>
            </label>
          </div>
        </div>
      </details>

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
