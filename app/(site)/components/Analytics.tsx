"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Registra uma visita ao carregar e um clique sempre que alguém clica num
// elemento com data-fbq="Rotulo" (os mesmos botões medidos pelo Pixel).
// Grava no Supabase; a leitura fica só no painel /admin/metricas.
export default function Analytics() {
  useEffect(() => {
    const supabase = createClient();

    supabase
      .from("analytics_eventos")
      .insert({
        tipo: "pageview",
        path: window.location.pathname,
        referrer: document.referrer || null,
      })
      .then(() => {});

    function onClick(e: MouseEvent) {
      const el = (e.target as HTMLElement)?.closest?.("[data-fbq]");
      if (!el) return;
      supabase
        .from("analytics_eventos")
        .insert({
          tipo: "click",
          rotulo: el.getAttribute("data-fbq"),
          path: window.location.pathname,
        })
        .then(() => {});
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
