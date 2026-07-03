"use client";

import { useActionState } from "react";
import { enviarLead, type LeadState } from "@/app/s/[site]/lead-action";
import type { FormularioConfig } from "@/lib/blocks/types";
import { detectarOrigem } from "@/lib/origem";

export default function FormularioBloco({
  config,
  siteId,
  orgId,
  paginaId,
}: {
  config: FormularioConfig;
  siteId: string;
  orgId: string;
  paginaId: string | null;
}) {
  const [state, formAction, pending] = useActionState<LeadState, FormData>(enviarLead, undefined);
  const campos = config.campos ?? [];

  if (state?.ok) {
    return (
      <div className="pp-form">
        <p className="pp-form-ok">{config.mensagem_sucesso || "Recebido! Em breve entramos em contato."}</p>
      </div>
    );
  }

  return (
    <form
      action={(fd) => {
        fd.set("_site", siteId);
        fd.set("_org", orgId);
        fd.set("_pagina", paginaId ?? "");
        fd.set("_origem", detectarOrigem());
        return formAction(fd);
      }}
      className="pp-form"
    >
      {campos.map((campo, i) => (
        <input
          key={i}
          name={`campo_${campo.nome}`}
          type={campo.tipo === "email" ? "email" : campo.tipo === "telefone" ? "tel" : "text"}
          placeholder={campo.nome}
          required={campo.obrigatorio}
        />
      ))}
      {state?.error && <p style={{ color: "var(--color-coral)", fontSize: 14 }}>{state.error}</p>}
      <button type="submit" className="pp-btn pp-btn-primario" disabled={pending} data-track="EnviouFormulario">
        {pending ? "Enviando…" : config.botao_texto || "Enviar"}
      </button>
    </form>
  );
}
