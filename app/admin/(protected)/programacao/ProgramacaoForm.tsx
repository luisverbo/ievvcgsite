"use client";

import { useActionState } from "react";
import { saveProgramacao } from "./actions";
import type { ProgramacaoItem } from "@/lib/types";
import { inputClass, labelClass, fieldClass } from "../ui";

export default function ProgramacaoForm({
  item,
  defaultDia,
}: {
  item?: ProgramacaoItem;
  defaultDia?: string;
}) {
  const [state, formAction, pending] = useActionState(saveProgramacao, undefined);
  const key = item?.id ?? "new";

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      {item && <input type="hidden" name="id" value={item.id} />}

      <div className={fieldClass}>
        <label className={labelClass} htmlFor={`dia-${key}`}>
          Dia
        </label>
        <input
          id={`dia-${key}`}
          name="dia"
          defaultValue={item?.dia ?? defaultDia}
          required
          placeholder="Sexta · 17 jul"
          className={inputClass}
        />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor={`horario-${key}`}>
          Horário
        </label>
        <input
          id={`horario-${key}`}
          name="horario"
          defaultValue={item?.horario}
          required
          placeholder="18h"
          className={`${inputClass} sm:w-24`}
        />
      </div>
      <div className={`${fieldClass} flex-1`}>
        <label className={labelClass} htmlFor={`descricao-${key}`}>
          Descrição
        </label>
        <input
          id={`descricao-${key}`}
          name="descricao"
          defaultValue={item?.descricao}
          required
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="h-fit rounded-full bg-coral px-5 py-2.5 font-bold text-cream disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Salvar"}
      </button>
      {state?.error && <p className="text-sm text-coral sm:basis-full">{state.error}</p>}
    </form>
  );
}
