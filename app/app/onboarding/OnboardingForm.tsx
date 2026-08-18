"use client";

import { useActionState } from "react";
import { criarOrganizacao, type OnboardingState } from "./actions";
import { inputClass, labelClass, fieldClass, btnPrimary } from "@/components/painel/ui";

/*
 * Uma pergunta só. O produto é o construtor com IA: site, nicho e endereço
 * são conversa para depois, dentro da ferramenta — cada campo a mais aqui é
 * gente desistindo antes de ver o produto.
 */
export default function OnboardingForm({ de }: { de?: string }) {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    criarOrganizacao,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* leva adiante a intenção de assinar de quem veio do preço da landing */}
      {de && <input type="hidden" name="de" value={de} />}
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="nome_org">
          Nome da sua empresa ou projeto
        </label>
        <input
          id="nome_org"
          name="nome_org"
          required
          autoFocus
          placeholder="Ex.: Agência Silva, Studio Maria…"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-paper-dim">
          É como você aparece no painel. Dá para mudar depois.
        </p>
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <button type="submit" disabled={pending} className={`mt-2 w-fit ${btnPrimary}`}>
        {pending ? "Criando…" : de ? "Continuar para o pagamento →" : "Entrar no painel →"}
      </button>
    </form>
  );
}
