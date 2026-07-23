"use client";

import { useActionState, useState } from "react";
import { usarTemplate, type UsarTemplateState } from "./actions";
import type { Template } from "@/lib/templates/catalog";
import type { Site } from "@/lib/types";
import { inputClass, labelClass, fieldClass, btnPrimary } from "@/components/painel/ui";
import { slugify } from "@/lib/format";

export default function TemplateCard({
  template,
  sites,
  sitePreSelecionado,
}: {
  template: Template;
  sites: Site[];
  sitePreSelecionado?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [slug, setSlug] = useState(slugify(template.nome));
  const [novoSiteSlug, setNovoSiteSlug] = useState(slugify(template.nome));
  const [state, formAction, pending] = useActionState<UsarTemplateState, FormData>(
    usarTemplate,
    undefined,
  );

  const semSites = sites.length === 0;

  return (
    <>
      <div className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-ink-2 transition hover:-translate-y-0.5 hover:border-brand-2/60 hover:shadow-xl">
        {/* mini-prévia com a paleta do template */}
        <div
          className="flex h-20 items-center justify-center text-4xl"
          style={{
            background: template.tema?.cores
              ? `linear-gradient(135deg, ${template.tema.cores.night2 ?? "#222"}, ${template.tema.cores.night ?? "#111"})`
              : "linear-gradient(135deg, #2a1732, #1e0f26)",
          }}
        >
          {template.icone}
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="font-bold">{template.nome}</h3>
            {template.tema?.cores && (
              <span className="flex flex-none gap-1">
                {[template.tema.cores.coral, template.tema.cores.gold, template.tema.cores.green]
                  .filter(Boolean)
                  .map((cor, i) => (
                    <i
                      key={i}
                      className="h-3 w-3 rounded-full border border-white/20"
                      style={{ background: cor }}
                    />
                  ))}
              </span>
            )}
          </div>
          <span className="text-xs text-paper-dim">{template.categoria}</span>
          <p className="mb-4 mt-2 flex-1 text-sm text-paper-dim">{template.descricao}</p>
          <div className="mb-4 text-xs font-semibold text-paper-dim">
            {template.blocos.length} blocos prontos
            {template.tema?.fonte_titulo ? ` · fonte ${template.tema.fonte_titulo}` : ""}
          </div>
          <button onClick={() => setAberto(true)} className={`${btnPrimary} w-full py-2 text-sm`}>
            Usar este template
          </button>
        </div>
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

            <form action={formAction} className="flex flex-col gap-4">
              <input type="hidden" name="template_id" value={template.id} />

              {semSites ? (
                <>
                  <p className="text-sm text-paper-dim">
                    Este template vai criar um site novo já pronto para editar.
                  </p>
                  <div className={fieldClass}>
                    <label className={labelClass}>Nome do site</label>
                    <input
                      name="novo_site_nome"
                      defaultValue={template.nome}
                      required
                      className={inputClass}
                      onChange={(e) => setNovoSiteSlug(slugify(e.target.value))}
                    />
                  </div>
                  <div className={fieldClass}>
                    <label className={labelClass}>Endereço do site</label>
                    <input
                      name="novo_site_slug"
                      value={novoSiteSlug}
                      onChange={(e) => setNovoSiteSlug(slugify(e.target.value))}
                      required
                      minLength={3}
                      className={inputClass}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className={fieldClass}>
                    <label className={labelClass}>Site</label>
                    <select
                      name="site_id"
                      required
                      defaultValue={sitePreSelecionado}
                      className={inputClass}
                    >
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
                </>
              )}

              {state?.error && <p className="text-sm text-danger">{state.error}</p>}

              <button type="submit" disabled={pending} className={`${btnPrimary} py-2.5`}>
                {pending
                  ? "Criando…"
                  : semSites
                    ? "Criar site com este template"
                    : "Criar página com este template"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
