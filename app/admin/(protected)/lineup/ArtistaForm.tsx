"use client";

import { useActionState } from "react";
import { saveArtista } from "./actions";
import type { Artista } from "@/lib/types";
import { inputClass, labelClass, fieldClass } from "../ui";

export default function ArtistaForm({ artista }: { artista?: Artista }) {
  const [state, formAction, pending] = useActionState(saveArtista, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {artista && <input type="hidden" name="id" value={artista.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className={fieldClass}>
          <label className={labelClass} htmlFor={`nome-${artista?.id ?? "new"}`}>
            Nome
          </label>
          <input
            id={`nome-${artista?.id ?? "new"}`}
            name="nome"
            defaultValue={artista?.nome}
            required
            className={inputClass}
          />
        </div>
        <div className={fieldClass}>
          <label className={labelClass} htmlFor={`estilo-${artista?.id ?? "new"}`}>
            Estilo
          </label>
          <input
            id={`estilo-${artista?.id ?? "new"}`}
            name="estilo"
            defaultValue={artista?.estilo}
            className={inputClass}
          />
        </div>
        <div className={fieldClass}>
          <label className={labelClass} htmlFor={`pais-${artista?.id ?? "new"}`}>
            País (com bandeira, ex: 🇧🇷 Brasil)
          </label>
          <input
            id={`pais-${artista?.id ?? "new"}`}
            name="pais"
            defaultValue={artista?.pais}
            className={inputClass}
          />
        </div>
        <label className="flex items-center gap-2 self-end pb-2.5 text-sm font-medium text-cream-dim">
          <input type="checkbox" name="ativo" defaultChecked={artista?.ativo ?? true} />
          Ativo (aparece na landing)
        </label>
      </div>

      <div className={fieldClass}>
        <label className={labelClass} htmlFor={`descricao-${artista?.id ?? "new"}`}>
          Descrição
        </label>
        <textarea
          id={`descricao-${artista?.id ?? "new"}`}
          name="descricao"
          defaultValue={artista?.descricao}
          rows={2}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className={fieldClass}>
          <label className={labelClass}>Foto — upload</label>
          <input type="file" name="foto_arquivo" accept="image/*" className={inputClass} />
          <label className={labelClass}>ou link da foto</label>
          <input
            name="foto_url"
            type="url"
            placeholder="https://..."
            defaultValue={artista?.foto_url ?? ""}
            className={inputClass}
          />
        </div>
        <div className={fieldClass}>
          <label className={labelClass}>Vídeo — upload</label>
          <input type="file" name="video_arquivo" accept="video/*" className={inputClass} />
          <label className={labelClass}>ou link (YouTube/Instagram)</label>
          <input
            name="video_url"
            type="url"
            placeholder="https://..."
            defaultValue={artista?.video_url ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-coral">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green">Salvo com sucesso.</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-full bg-coral px-6 py-2.5 font-bold text-cream disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
