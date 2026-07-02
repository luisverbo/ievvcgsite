"use client";

import { useActionState, useState } from "react";
import { criarOrganizacao, type OnboardingState } from "./actions";
import { slugify } from "@/lib/format";
import { inputClass, labelClass, fieldClass, btnPrimary } from "@/components/painel/ui";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "seudominio.com.br";

export default function OnboardingForm() {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    criarOrganizacao,
    undefined,
  );
  const [slug, setSlug] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="nome_org">
          Nome da sua empresa ou projeto
        </label>
        <input id="nome_org" name="nome_org" required className={inputClass} />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="nome_site">
          Nome do seu primeiro site
        </label>
        <input
          id="nome_site"
          name="nome_site"
          required
          className={inputClass}
          onChange={(e) => setSlug(slugify(e.target.value))}
        />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="slug">
          Endereço do site
        </label>
        <div className="flex items-center gap-2">
          <input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            required
            minLength={3}
            className={`${inputClass} flex-1`}
          />
          <span className="text-sm text-paper-dim">.{ROOT}</span>
        </div>
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <button type="submit" disabled={pending} className={`mt-2 w-fit ${btnPrimary}`}>
        {pending ? "Criando…" : "Criar meu site"}
      </button>
    </form>
  );
}
