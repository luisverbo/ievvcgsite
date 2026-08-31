"use client";

import { useActionState } from "react";
import { salvarPixelVendas, type PixelVendasState } from "./actions";
import { cardClass, inputClass } from "@/components/painel/ui";

/*
 * Onde você cola o pixel das SUAS páginas de venda.
 *
 * Um card só para as duas landings (/ e /prospector) porque na prática é um
 * anúncio só: você mede a visita e o clique no botão de assinar nas duas, e
 * separa por página lá dentro do Gerenciador, não aqui.
 *
 * Não confundir com o pixel que o CLIENTE põe na página dele — esse fica em
 * cada página de IA, na aba Domínio.
 */
export default function PixelVendas({
  meta,
  google,
  extra,
}: {
  meta: string;
  google: string;
  extra: string;
}) {
  const [estado, acao, pendente] = useActionState<PixelVendasState, FormData>(
    salvarPixelVendas,
    undefined,
  );

  const ligado = Boolean(meta || google || extra);

  return (
    <div className={cardClass}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold">📈 Pixel das páginas de venda</h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
            ligado ? "bg-ok/15 text-ok" : "bg-white/10 text-paper-dim"
          }`}
        >
          {ligado ? "● rastreando" : "○ sem pixel"}
        </span>
      </div>
      <p className="mt-2 text-sm text-paper-dim">
        Vale para as duas landings: a principal (<code className="text-paper">/</code>) e a do
        Prospector (<code className="text-paper">/prospector</code>). Além da visita, o clique em
        qualquer botão de assinar é enviado como <b>InitiateCheckout</b> (Meta) e{" "}
        <b>begin_checkout</b> (Google) — é isso que faz o anúncio procurar comprador em vez de
        curioso. Salvar já publica; não precisa de deploy.
      </p>

      <form action={acao} className="mt-4 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-paper-dim">
              Meta / Facebook — ID do pixel
            </span>
            <input
              name="pixel_meta"
              defaultValue={meta}
              placeholder="1234567890123"
              inputMode="numeric"
              autoComplete="off"
              className={`${inputClass} font-mono text-sm`}
            />
            <span className="text-[11px] text-paper-dim">
              Gerenciador de Eventos → Fontes de dados. Só os números.
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-paper-dim">
              Google — tag (GA4 ou Ads)
            </span>
            <input
              name="pixel_google"
              defaultValue={google}
              placeholder="G-ABC1234567"
              autoComplete="off"
              className={`${inputClass} font-mono text-sm`}
            />
            <span className="text-[11px] text-paper-dim">
              <code>G-</code> do Analytics, <code>AW-</code> do Google Ads ou <code>GT-</code> do
              Tag Manager.
            </span>
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-paper-dim">
            Outro código (opcional)
          </span>
          <textarea
            name="pixel_extra"
            defaultValue={extra}
            rows={4}
            spellCheck={false}
            placeholder="<!-- TikTok Pixel, Microsoft Clarity, Hotjar… cole o código inteiro aqui -->"
            className={`${inputClass} resize-y font-mono text-xs`}
          />
          <span className="text-[11px] text-paper-dim">
            Vai inteiro, como veio da ferramenta. Só você (admin) escreve aqui — o campo aceita
            HTML de propósito, então cole apenas código de ferramenta que você conhece.
          </span>
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pendente}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
          >
            {pendente ? "Salvando…" : "Salvar pixel"}
          </button>
          <span className="text-[11px] text-paper-dim">
            Apague os campos e salve para parar de rastrear.
          </span>
        </div>
      </form>

      {estado?.error && (
        <p role="alert" className="mt-3 text-xs font-medium text-danger">
          {estado.error}
        </p>
      )}
      {estado?.ok && (
        <p role="status" className="mt-3 text-xs font-medium text-ok">
          {estado.ok}
        </p>
      )}
    </div>
  );
}
