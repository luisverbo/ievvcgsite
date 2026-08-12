"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/*
 * Mostra o Pix e fica olhando se caiu.
 *
 * A confirmação chega pelo webhook, não por aqui — esta tela só recarrega de
 * tempos em tempos para o cliente ver o acesso voltar sem apertar F5.
 */
export default function CodigoPix({
  qrCode,
  qrCodeBase64,
  expiraEm,
}: {
  qrCode: string;
  qrCodeBase64: string | null;
  expiraEm: string | null;
}) {
  const router = useRouter();
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), 10_000);
    return () => window.clearInterval(id);
  }, [router]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(qrCode);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Navegador sem permissão de área de transferência: o código está na
      // tela, dá para selecionar na mão.
    }
  };

  return (
    <div className="rounded-xl border border-ok/30 bg-ok/5 p-5">
      <h2 className="text-sm font-bold text-ok">Pix gerado — pague para liberar na hora</h2>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
        {qrCodeBase64 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:image/png;base64,${qrCodeBase64}`}
            alt="QR Code do Pix"
            className="h-44 w-44 flex-none rounded-lg bg-white p-2"
          />
        )}

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-paper-dim">Pix copia e cola</p>
          <p className="mt-1 max-h-24 overflow-y-auto break-all rounded-lg bg-ink px-3 py-2 font-mono text-[11px] text-paper-dim">
            {qrCode}
          </p>
          <button
            type="button"
            onClick={copiar}
            className="mt-2 rounded-lg bg-ok/20 px-4 py-2 text-sm font-bold text-ok transition hover:bg-ok/30"
          >
            {copiado ? "✓ Copiado" : "Copiar código"}
          </button>
          {expiraEm && (
            <p className="mt-2 text-xs text-paper-dim">
              Vale até {new Date(expiraEm).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
              . Esta tela se atualiza sozinha quando o pagamento cair.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
