"use client";

import { useActionState } from "react";
import { criarPaginaIA, type NovaPaginaState } from "./actions";
import { MODELOS_IA, MODELO_PADRAO } from "@/lib/ia/modelos";
import { inputClass } from "@/components/painel/ui";

/*
 * `admin` decide se o seletor de modelo aparece. Para o cliente ele não
 * existe: toda página nasce no MODELO_PADRAO, e o servidor confirma isso —
 * campo escondido em formulário não é segurança.
 */
export default function NovaPagina({
  contaPronta,
  aviso,
  admin = false,
}: {
  contaPronta: boolean;
  aviso: string | null;
  admin?: boolean;
}) {
  const [state, formAction, pending] = useActionState<NovaPaginaState, FormData>(
    criarPaginaIA,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          name="titulo"
          placeholder="Nome da página (ex: Pudim de Copo — página de vendas)"
          className={`${inputClass} flex-1`}
          required
        />
        {admin && (
          <select name="modelo" defaultValue={MODELO_PADRAO} className={inputClass}>
            {Object.entries(MODELOS_IA).map(([id, m]) => (
              <option key={id} value={id}>
                {m.rotulo}
              </option>
            ))}
          </select>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
        >
          {pending ? "Criando…" : "Criar página"}
        </button>
      </div>
      <p className="text-xs text-paper-dim">
        {admin
          ? `${MODELOS_IA[MODELO_PADRAO].nota} · dá para trocar o modelo depois, a qualquer momento.`
          : "Descreva a página no chat e a IA escreve tudo — texto, seções, cores e animações."}
      </p>
      {!contaPronta && (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          ⚠️ {aviso}{" "}
          <a href="/app/creditos" className="underline">
            Ver créditos
          </a>
          .
        </p>
      )}
      {state?.error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {state.error}
        </p>
      )}
    </form>
  );
}
