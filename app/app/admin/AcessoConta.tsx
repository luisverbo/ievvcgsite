"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renovarAcesso, encerrarAcesso } from "./actions";

/*
 * O acesso de uma conta, na linha dela.
 *
 * Trocar o PLANO (os botões ao lado) diz o que a conta comprou; isto aqui diz
 * até quando ela pode usar. São coisas diferentes, e confundi-las custou uma
 * manhã: uma conta no Prospector com assinatura suspensa aparecia como
 * "Prospector · ativo" e mesmo assim batia na porta fechada, porque quem
 * manda no acesso é a assinatura, não o plano.
 *
 * Para que serve na prática: criar contas de teste suas e entregar o sistema
 * numa negociação fechada por fora, sem passar pela Stripe. E "Encerrar" é o
 * jeito de ver a tela do cliente bloqueado sem esperar sete dias.
 */

export type EstadoAcesso = {
  /* "Ativa até 12/10", "Teste até 16/09", "Suspensa", "Sem assinatura" */
  rotulo: string;
  cor: "ok" | "warn" | "danger" | "dim";
  /* Plano free: não há acesso pago para renovar — escolha um plano antes. */
  semPlano: boolean;
};

const COR: Record<EstadoAcesso["cor"], string> = {
  ok: "text-ok",
  warn: "text-warn",
  danger: "text-danger",
  dim: "text-paper-dim",
};

export default function AcessoConta({
  orgId,
  nome,
  estado,
}: {
  orgId: string;
  nome: string;
  estado: EstadoAcesso;
}) {
  const router = useRouter();
  const [indo, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function agir(fn: () => Promise<void>) {
    setErro(null);
    iniciar(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setErro((e as Error).message);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <span className={`text-xs font-bold ${COR[estado.cor]}`}>{estado.rotulo}</span>

      {estado.semPlano ? (
        <span className="text-[10px] text-paper-dim">escolha um plano para liberar</span>
      ) : (
        <div className="flex items-center gap-1">
          {[7, 30, 365].map((dias) => (
            <button
              key={dias}
              type="button"
              disabled={indo}
              onClick={() => agir(() => renovarAcesso(orgId, dias))}
              title={`Libera o acesso por mais ${dias} dias, a partir da data que já existe.`}
              className="rounded-md border border-white/15 px-2 py-1 text-[11px] font-bold text-paper-dim transition hover:border-ok hover:text-ok disabled:opacity-50"
            >
              +{dias === 365 ? "1 ano" : `${dias}d`}
            </button>
          ))}
          <button
            type="button"
            disabled={indo}
            onClick={() => {
              if (!window.confirm(`Cortar o acesso de "${nome}" agora?\n\nNada é apagado: a conta continua, os dados continuam, e ela passa a ver a tela de renovar.`)) {
                return;
              }
              agir(() => encerrarAcesso(orgId));
            }}
            className="rounded-md border border-white/15 px-2 py-1 text-[11px] font-bold text-paper-dim transition hover:border-danger hover:text-danger disabled:opacity-50"
          >
            encerrar
          </button>
        </div>
      )}

      {erro && <span className="max-w-[220px] text-right text-[10px] text-danger">{erro}</span>}
    </div>
  );
}
