"use client";

import { useActionState } from "react";
import { addGaleriaFoto } from "./actions";
import UploadInput from "../UploadInput";

export default function AddFotoForm() {
  const [state, formAction, pending] = useActionState(addGaleriaFoto, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <UploadInput
          name="imagem_url"
          label="Foto — enviar do computador/celular"
          linkLabel="ou link da imagem"
          accept="image/*"
          folder="galeria"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="h-fit rounded-full bg-coral px-5 py-2.5 font-bold text-cream disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Adicionar"}
      </button>
      {state?.error && <p className="text-sm text-coral sm:basis-full">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green sm:basis-full">Foto adicionada.</p>}
    </form>
  );
}
