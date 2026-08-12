"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { comprarCreditoPix } from "../assinatura/actions";

/*
 * Pix para comprar crédito.
 *
 * Aqui o Pix é livre, ao contrário da mensalidade: numa compra avulsa o
 * dinheiro entra antes do crédito sair, então não existe risco de calote.
 */
export default function PixCredito({ dolares, preco }: { dolares: number; preco: number }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [pix, setPix] = useState<{ qrCode: string; qrCodeBase64: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  const gerar = () =>
    iniciar(async () => {
      setErro(null);
      const r = await comprarCreditoPix(dolares);
      if (!r) return;
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setPix({ qrCode: r.qrCode, qrCodeBase64: r.qrCodeBase64 });
      // O crédito entra pelo webhook; a tela só precisa acompanhar.
      window.setTimeout(() => router.refresh(), 15_000);
    });

  if (pix) {
    return (
      <div className="mt-2 rounded-lg border border-ok/30 bg-ok/5 p-2">
        {pix.qrCodeBase64 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:image/png;base64,${pix.qrCodeBase64}`}
            alt="QR Code do Pix"
            className="mx-auto h-32 w-32 rounded bg-white p-1"
          />
        )}
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(pix.qrCode);
              setCopiado(true);
            } catch {
              setErro("Não consegui copiar. Use o QR Code.");
            }
          }}
          className="mt-2 w-full rounded-lg bg-ok/20 px-3 py-2 text-xs font-bold text-ok"
        >
          {copiado ? "✓ Código copiado" : "Copiar Pix copia e cola"}
        </button>
        <p className="mt-1 text-center text-[11px] text-paper-dim">
          O crédito entra sozinho assim que o Pix cair.
        </p>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={gerar}
        disabled={pendente}
        className="mt-1.5 w-full rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-paper-dim transition hover:border-ok hover:text-ok disabled:opacity-60"
      >
        {pendente ? "Gerando…" : `Pix · R$ ${preco.toLocaleString("pt-BR")}`}
      </button>
      {erro && <p className="mt-1 text-[11px] text-danger">{erro}</p>}
    </>
  );
}
