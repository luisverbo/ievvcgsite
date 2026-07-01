"use client";

import { useActionState } from "react";
import { saveFaq } from "./actions";
import type { FaqItemRow } from "@/lib/types";
import { inputClass, labelClass, fieldClass } from "../ui";

export default function FaqForm({ item }: { item?: FaqItemRow }) {
  const [state, formAction, pending] = useActionState(saveFaq, undefined);
  const key = item?.id ?? "new";

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {item && <input type="hidden" name="id" value={item.id} />}

      <div className={fieldClass}>
        <label className={labelClass} htmlFor={`pergunta-${key}`}>
          Pergunta
        </label>
        <input
          id={`pergunta-${key}`}
          name="pergunta"
          defaultValue={item?.pergunta}
          required
          className={inputClass}
        />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor={`resposta-${key}`}>
          Resposta
        </label>
        <textarea
          id={`resposta-${key}`}
          name="resposta"
          defaultValue={item?.resposta}
          rows={2}
          required
          className={inputClass}
        />
      </div>

      {state?.error && <p className="text-sm text-coral">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-full bg-coral px-5 py-2.5 font-bold text-cream disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
