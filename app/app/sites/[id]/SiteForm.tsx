"use client";

import { useActionState } from "react";
import { salvarSite, type SaveState } from "./actions";
import type { Site } from "@/lib/types";
import { PRESETS_TEMA, CORES_PADRAO } from "@/lib/theme";
import { inputClass, labelClass, fieldClass, btnPrimary } from "@/components/painel/ui";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "seudominio.com.br";

// Descobre qual preset corresponde ao tema salvo (para pré-selecionar).
function presetAtual(site: Site): string {
  const cores = site.tema?.cores;
  if (!cores || Object.keys(cores).length === 0) return "padrao";
  for (const [key, preset] of Object.entries(PRESETS_TEMA)) {
    if (key === "padrao") continue;
    if (preset.cores.night === cores.night && preset.cores.gold === cores.gold) return key;
  }
  return "";
}

export default function SiteForm({ site }: { site: Site }) {
  const [state, formAction, pending] = useActionState<SaveState, FormData>(salvarSite, undefined);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <input type="hidden" name="id" value={site.id} />

      <div className={fieldClass}>
        <label className={labelClass} htmlFor="nome">
          Nome do site
        </label>
        <input id="nome" name="nome" defaultValue={site.nome} required className={inputClass} />
      </div>

      <div className={fieldClass}>
        <label className={labelClass} htmlFor="slug">
          Endereço
        </label>
        <div className="flex items-center gap-2">
          <input
            id="slug"
            name="slug"
            defaultValue={site.slug}
            required
            minLength={3}
            className={`${inputClass} flex-1`}
          />
          <span className="text-sm text-paper-dim">.{ROOT}</span>
        </div>
      </div>

      <div className={fieldClass}>
        <label className={labelClass} htmlFor="tema_preset">
          Paleta de cores das páginas
        </label>
        <select
          id="tema_preset"
          name="tema_preset"
          defaultValue={presetAtual(site)}
          className={inputClass}
        >
          {presetAtual(site) === "" && <option value="">Personalizada (atual)</option>}
          {Object.entries(PRESETS_TEMA).map(([key, preset]) => (
            <option key={key} value={key}>
              {preset.label}
            </option>
          ))}
        </select>
        <div className="mt-1 flex gap-1.5">
          {(["night", "gold", "coral", "green", "violet"] as const).map((c) => (
            <span
              key={c}
              className="h-5 w-5 rounded-full border border-white/20"
              style={{ backgroundColor: site.tema?.cores?.[c] ?? CORES_PADRAO[c] }}
            />
          ))}
        </div>
      </div>

      <div className={fieldClass}>
        <label className={labelClass} htmlFor="whatsapp_numero">
          WhatsApp (com DDI, ex: 5521999999999)
        </label>
        <input
          id="whatsapp_numero"
          name="whatsapp_numero"
          defaultValue={site.whatsapp_numero ?? ""}
          className={inputClass}
        />
      </div>

      <div className={fieldClass}>
        <label className={labelClass} htmlFor="facebook_pixel_id">
          Pixel do Facebook (só números, opcional)
        </label>
        <input
          id="facebook_pixel_id"
          name="facebook_pixel_id"
          inputMode="numeric"
          defaultValue={site.facebook_pixel_id ?? ""}
          className={inputClass}
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-paper-dim">
        <input type="checkbox" name="publicado" defaultChecked={site.publicado} />
        Site publicado (visível para qualquer pessoa)
      </label>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.ok && <p className="text-sm text-ok">Salvo com sucesso.</p>}

      <button type="submit" disabled={pending} className={`w-fit ${btnPrimary}`}>
        {pending ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
