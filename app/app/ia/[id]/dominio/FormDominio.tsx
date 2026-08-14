"use client";

import { useActionState, useState } from "react";
import { adicionarDominio, type DominioState } from "./actions";
import { inputClass } from "@/components/painel/ui";

/*
 * `livre` = quantos sites ainda cabem no plano. `null` significa sem limite
 * (você, dono do sistema).
 *
 * O aviso de cobrança aparece ANTES do clique quando já dá para saber que vai
 * passar da cota, e depois do clique quando o servidor confirma. Descobrir que
 * vai pagar só depois de ter pago é o jeito mais rápido de perder o cliente.
 */
export default function FormDominio({
  siteIaId,
  livre,
  precoExtra,
}: {
  siteIaId: string;
  livre: number | null;
  precoExtra: string;
}) {
  const [estado, acao, pendente] = useActionState<DominioState, FormData>(
    adicionarDominio.bind(null, siteIaId),
    undefined,
  );
  const [autorizado, setAutorizado] = useState(false);

  const semLimite = livre === null;
  const vaiCobrar = !semLimite && (livre ?? 0) <= 0;
  // O servidor pode discordar do que a tela achava (outra aba conectou um
  // domínio no meio do caminho). Quando ele pede autorização, ela aparece.
  const pedeAutorizacao = vaiCobrar || estado?.precisaExtra === true;

  return (
    <form action={acao} className="rounded-xl border border-white/10 bg-ink-2 p-5">
      <h2 className="text-sm font-bold text-paper">Conectar um domínio</h2>
      <p className="mt-1 text-xs text-paper-dim">
        Digite o domínio do seu cliente — só o endereço, sem https:// e sem barras.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          name="dominio"
          placeholder="clinicasorriso.com.br"
          autoComplete="off"
          className={`${inputClass} min-w-0 flex-1 font-mono text-sm`}
        />
        <button
          type="submit"
          disabled={pendente || (pedeAutorizacao && !autorizado)}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
        >
          {pendente ? "Registrando…" : pedeAutorizacao ? "Conectar site extra" : "Conectar"}
        </button>
      </div>

      {pedeAutorizacao && (
        <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2.5">
          <input
            type="checkbox"
            name="extra"
            value="1"
            checked={autorizado}
            onChange={(e) => setAutorizado(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
          />
          <span className="text-xs text-paper">
            Autorizo somar <b>R$ {precoExtra} por mês</b> à minha assinatura por este site extra.
            <span className="mt-0.5 block text-paper-dim">
              Neste primeiro mês entra só a parte proporcional aos dias que faltam. Se você
              desconectar o domínio, a cobrança sai sozinha e o valor pago a mais volta como crédito
              na próxima fatura.
            </span>
          </span>
        </label>
      )}

      {estado?.error && (
        <p role="alert" className="mt-2 text-xs font-medium text-danger">
          {estado.error}
        </p>
      )}
      {estado?.ok && (
        <p role="status" className="mt-2 text-xs font-medium text-ok">
          {estado.ok}
        </p>
      )}
    </form>
  );
}
