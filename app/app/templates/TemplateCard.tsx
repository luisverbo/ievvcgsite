"use client";

import { useState } from "react";
import { usarTemplate } from "./actions";
import type { Template } from "@/lib/templates/catalog";
import type { Site } from "@/lib/types";
import { inputClass, labelClass, fieldClass, btnPrimary } from "@/components/painel/ui";
import { slugify } from "@/lib/format";

export default function TemplateCard({ template, sites }: { template: Template; sites: Site[] }) {
  const [aberto, setAberto] = useState(false);
  const [slug, setSlug] = useState(slugify(template.nome));

  return (
    <>
      <div className="flex flex-col rounded-xl border border-white/10 bg-ink-2 p-5 transition hover:border-brand-2">
        <div className="mb-3 flex items-center gap-3">
          <span className="text-3xl">{template.icone}</span>
          <div>
            <h3 className="font-bold">{template.nome}</h3>
            <span className="text-xs text-paper-dim">{template.categoria}</span>
          </div>
        </div>
        <p className="mb-4 flex-1 text-sm text-paper-dim">{template.descricao}</p>
        <div className="mb-3 flex flex-wrap gap-1">
          {template.blocos.map((b) => (
            <span key={b.tipo} className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-paper-dim">
              {b.tipo}
            </span>
          ))}
        </div>
        <button
          onClick={() => setAberto(true)}
          className={`${btnPrimary} w-full py-2 text-sm`}
        >
          Usar este template
        </button>
      </div>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setAberto(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-2 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">
                {template.icone} {template.nome}
              </h2>
              <button onClick={() => setAberto(false)} className="text-paper-dim">
                ✕
              </button>
            </div>
            <form action={usarTemplate} className="flex flex-col gap-4">
              <input type="hidden" name="template_id" value={template.id} />
              <div className={fieldClass}>
                <label className={labelClass}>Site</label>
                <select name="site_id" required className={inputClass}>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className={fieldClass}>
                <label className={labelClass}>Nome da página</label>
                <input
                  name="titulo"
                  defaultValue={template.nome}
                  required
                  className={inputClass}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                />
              </div>
              <div className={fieldClass}>
                <label className={labelClass}>Endereço (/…)</label>
                <input
                  name="slug"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  required
                  className={inputClass}
                />
              </div>
              <button type="submit" className={`${btnPrimary} py-2.5`}>
                Criar página com este template
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
