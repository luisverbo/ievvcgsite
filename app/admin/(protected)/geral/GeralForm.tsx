"use client";

import { useActionState } from "react";
import { saveConfigEvento } from "./actions";
import type { ConfigEvento } from "@/lib/types";
import { toDatetimeLocalValue } from "@/lib/format";

const inputClass =
  "rounded-lg border border-white/15 bg-night-2 px-4 py-2.5 text-cream outline-none focus-visible:border-gold";
const labelClass = "text-sm font-medium text-cream-dim";
const fieldClass = "flex flex-col gap-1.5";

export default function GeralForm({ config }: { config: ConfigEvento }) {
  const [state, formAction, pending] = useActionState(saveConfigEvento, undefined);
  const isFallback = config.id === "fallback";

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      {!isFallback && <input type="hidden" name="id" value={config.id} />}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 font-display text-lg font-extrabold">Hero</legend>
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="titulo_hero">
            Título
          </label>
          <input
            id="titulo_hero"
            name="titulo_hero"
            defaultValue={config.titulo_hero}
            className={inputClass}
          />
        </div>
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="subtitulo_hero">
            Subtítulo
          </label>
          <textarea
            id="subtitulo_hero"
            name="subtitulo_hero"
            defaultValue={config.subtitulo_hero}
            rows={2}
            className={inputClass}
          />
        </div>
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="video_hero_url">
            Vídeo de abertura (link)
          </label>
          <input
            id="video_hero_url"
            name="video_hero_url"
            type="url"
            placeholder="https://..."
            defaultValue={config.video_hero_url ?? ""}
            className={inputClass}
          />
        </div>
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="botao_lineup_texto">
            Texto do botão &ldquo;Ver line-up&rdquo; (fica ao lado de &ldquo;Garantir
            ingresso&rdquo;)
          </label>
          <input
            id="botao_lineup_texto"
            name="botao_lineup_texto"
            defaultValue={config.botao_lineup_texto}
            className={inputClass}
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-cream-dim">
          <input
            type="checkbox"
            name="botao_lineup_visivel"
            defaultChecked={config.botao_lineup_visivel}
          />
          Mostrar esse botão no topo (a seção de line-up continua na página de qualquer forma)
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 font-display text-lg font-extrabold">Sobre a festa</legend>
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="texto_sobre">
            Texto
          </label>
          <textarea
            id="texto_sobre"
            name="texto_sobre"
            defaultValue={config.texto_sobre}
            rows={4}
            className={inputClass}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 font-display text-lg font-extrabold">Ingresso</legend>
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="data_evento">
            Data e hora do evento (alimenta a contagem regressiva)
          </label>
          <input
            id="data_evento"
            name="data_evento"
            type="datetime-local"
            defaultValue={toDatetimeLocalValue(config.data_evento)}
            className={inputClass}
          />
        </div>
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="preco_ingresso">
            Preço (R$)
          </label>
          <input
            id="preco_ingresso"
            name="preco_ingresso"
            type="number"
            step="0.01"
            min="0"
            defaultValue={config.preco_ingresso}
            className={inputClass}
          />
        </div>
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="link_compra">
            Link de compra
          </label>
          <input
            id="link_compra"
            name="link_compra"
            type="url"
            placeholder="https://..."
            defaultValue={config.link_compra ?? ""}
            className={inputClass}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 font-display text-lg font-extrabold">Contato & local</legend>
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="endereco">
            Endereço
          </label>
          <input
            id="endereco"
            name="endereco"
            defaultValue={config.endereco}
            className={inputClass}
          />
        </div>
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="telefone">
            Telefone / Secretaria
          </label>
          <input
            id="telefone"
            name="telefone"
            defaultValue={config.telefone ?? ""}
            className={inputClass}
          />
        </div>
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={config.email ?? ""}
            className={inputClass}
          />
        </div>
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="whatsapp_numero">
            WhatsApp (com DDI, ex: 5521981583331)
          </label>
          <input
            id="whatsapp_numero"
            name="whatsapp_numero"
            defaultValue={config.whatsapp_numero ?? ""}
            className={inputClass}
          />
        </div>
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="instagram_url">
            Instagram
          </label>
          <input
            id="instagram_url"
            name="instagram_url"
            type="url"
            placeholder="https://instagram.com/..."
            defaultValue={config.instagram_url ?? ""}
            className={inputClass}
          />
        </div>
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="facebook_url">
            Facebook
          </label>
          <input
            id="facebook_url"
            name="facebook_url"
            type="url"
            placeholder="https://facebook.com/..."
            defaultValue={config.facebook_url ?? ""}
            className={inputClass}
          />
        </div>
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="site_url">
            Site oficial
          </label>
          <input
            id="site_url"
            name="site_url"
            type="url"
            placeholder="https://..."
            defaultValue={config.site_url ?? ""}
            className={inputClass}
          />
        </div>
      </fieldset>

      {state?.error && <p className="text-sm text-coral">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green">Salvo com sucesso.</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-full bg-coral px-6 py-3 font-bold text-cream disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
