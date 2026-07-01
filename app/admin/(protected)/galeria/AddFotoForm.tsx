"use client";

import { useActionState } from "react";
import { addGaleriaFoto } from "./actions";
import { inputClass, labelClass, fieldClass } from "../ui";

export default function AddFotoForm() {
  const [state, formAction, pending] = useActionState(addGaleriaFoto, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className={fieldClass}>
        <label className={labelClass}>Foto — upload</label>
        <input type="file" name="imagem_arquivo" accept="image/*" className={inputClass} />
      </div>
      <div className={fieldClass}>
        <label className={labelClass}>ou link da imagem</label>
        <input name="imagem_url" type="url" placeholder="https://..." className={inputClass} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="h-fit rounded-full bg-coral px-5 py-2.5 font-bold text-cream disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Adicionar"}
      </button>
      {state?.error && <p className="text-sm text-coral sm:basis-full">{state.error}</p>}
    </form>
  );
}
