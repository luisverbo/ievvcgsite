"use client";

import { useActionState } from "react";
import { salvarPixel, type PixelState } from "../actions";
import { IconX } from "@/components/painel/icons";

export default function PainelPixel({
  siteIaId,
  pixelInicial,
  codigoInicial,
  onFechar,
}: {
  siteIaId: string;
  pixelInicial: string | null;
  codigoInicial: string | null;
  onFechar: () => void;
}) {
  const [state, formAction, pending] = useActionState<PixelState, FormData>(
    salvarPixel.bind(null, siteIaId),
    undefined,
  );

  return (
    <div className="absolute right-4 top-4 z-10 flex max-h-[85%] w-96 flex-col rounded-xl border border-white/10 bg-ink-2 p-4 shadow-2xl">
      <div className="mb-3 flex flex-none items-center justify-between">
        <h2 className="text-sm font-bold">Pixel e tags 📈</h2>
        <button onClick={onFechar} className="text-paper-dim transition hover:text-paper">
          <IconX size={14} />
        </button>
      </div>

      <form action={formAction} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-paper-dim">
            ID do Pixel do Facebook
          </label>
          <input
            name="facebook_pixel_id"
            defaultValue={pixelInicial ?? ""}
            placeholder="123456789012345"
            autoComplete="off"
            className="w-full rounded-lg border border-white/10 bg-ink px-3 py-2 text-sm text-paper outline-none focus-visible:border-brand-2"
          />
          <p className="mt-1.5 text-[11px] text-paper-dim">
            Só o número, do Gerenciador de Eventos. Se colar o script inteiro, eu extraio o ID
            sozinho. Dispara <b className="text-paper">PageView</b> ao abrir e{" "}
            <b className="text-paper">InitiateCheckout</b> em cada clique nos botões de ação.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-paper-dim">
            Outras tags no &lt;head&gt; (opcional)
          </label>
          <textarea
            name="codigo_head"
            defaultValue={codigoInicial ?? ""}
            rows={6}
            placeholder="<!-- Google Analytics, Google Ads, Pixel do TikTok, GTM… -->"
            className="w-full resize-y rounded-lg border border-white/10 bg-ink px-3 py-2 font-mono text-[11px] text-paper outline-none focus-visible:border-brand-2"
          />
          <p className="mt-1.5 text-[11px] text-paper-dim">
            Código colado aqui roda na página publicada. Só cole o que vier de fonte confiável.
          </p>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="flex-none rounded-lg bg-brand py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar"}
        </button>

        {state?.error && <p className="text-xs text-danger">{state.error}</p>}
        {state?.ok && (
          <p className="text-xs text-ok">
            Salvo ✅ Já vale na página publicada — atualize a aba para conferir.
          </p>
        )}
      </form>
    </div>
  );
}
