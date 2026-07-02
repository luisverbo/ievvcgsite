"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { detectarOrigem } from "@/lib/origem";

// Registra visita e cliques (elementos com data-track="Rotulo") de uma página
// publicada, com o contexto multi-tenant (org/site/página/funil).
export default function Analytics({
  orgId,
  siteId,
  paginaId,
  funilId,
}: {
  orgId: string;
  siteId: string;
  paginaId?: string | null;
  funilId?: string | null;
}) {
  useEffect(() => {
    const supabase = createClient();
    const base = {
      org_id: orgId,
      site_id: siteId,
      pagina_id: paginaId ?? null,
      funil_id: funilId ?? null,
    };

    supabase
      .from("analytics_eventos")
      .insert({
        ...base,
        tipo: "pageview",
        path: window.location.pathname,
        referrer: document.referrer || null,
        origem: detectarOrigem(),
      })
      .then(() => {});

    function onClick(e: MouseEvent) {
      const el = (e.target as HTMLElement)?.closest?.("[data-track]");
      if (!el) return;
      supabase
        .from("analytics_eventos")
        .insert({
          ...base,
          tipo: "click",
          rotulo: el.getAttribute("data-track"),
          path: window.location.pathname,
        })
        .then(() => {});
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [orgId, siteId, paginaId, funilId]);

  return null;
}
