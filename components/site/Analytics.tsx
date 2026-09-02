"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { detectarOrigem } from "@/lib/origem";

// Registra visita, cliques (elementos com data-track="Rotulo") e, ao sair,
// um evento "saida" com scroll máximo, tempo total e tempo por zona da
// página (base do mapa de calor de rolagem).
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
    /*
     * BLINDADO: nada aqui dentro pode derrubar a página.
     *
     * Este componente mede — e medição que lança dentro do useEffect vira
     * erro não tratado, que o React entrega à tela de erro global. Foi
     * exatamente o que aconteceu num build sem as variáveis do Supabase:
     * a landing inteira virou "This page couldn't load". Medição falha em
     * silêncio; a página de vendas nunca.
     */
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }
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
      .then(() => {}, () => {});

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
          origem: detectarOrigem(),
        })
        .then(() => {}, () => {});
    }
    document.addEventListener("click", onClick);

    /* ---- mapa de calor de rolagem + tempo na página ---- */
    const inicio = Date.now();
    let maxScroll = 0; // % da página já vista (10..100, em dezenas)
    const tempoPorZona: Record<string, number> = {}; // zona (10..100) -> segundos

    function zonaAtual(): number {
      const doc = document.documentElement;
      const alturaTotal = Math.max(1, doc.scrollHeight);
      const centro = window.scrollY + window.innerHeight / 2;
      const pct = Math.min(100, Math.max(1, (centro / alturaTotal) * 100));
      return Math.min(100, Math.ceil(pct / 10) * 10);
    }

    function medirScroll() {
      const doc = document.documentElement;
      const alturaTotal = Math.max(1, doc.scrollHeight);
      const visto = Math.min(100, ((window.scrollY + window.innerHeight) / alturaTotal) * 100);
      const zona = Math.min(100, Math.ceil(visto / 10) * 10);
      if (zona > maxScroll) maxScroll = zona;
    }
    medirScroll();
    window.addEventListener("scroll", medirScroll, { passive: true });

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const z = String(zonaAtual());
      tempoPorZona[z] = (tempoPorZona[z] ?? 0) + 1;
      medirScroll();
    }, 1000);

    let saidaEnviada = false;
    function enviarSaida() {
      if (saidaEnviada) return;
      const tempoS = Math.round((Date.now() - inicio) / 1000);
      if (tempoS < 1) return;
      saidaEnviada = true;
      // sendBeacon sobrevive ao fechamento da aba (fetch normal não).
      const payload = JSON.stringify({
        ...base,
        path: window.location.pathname,
        max_scroll: maxScroll,
        tempo_s: tempoS,
        zonas: tempoPorZona,
      });
      navigator.sendBeacon("/api/pp-saida", new Blob([payload], { type: "application/json" }));
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") enviarSaida();
    }
    window.addEventListener("pagehide", enviarSaida);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("scroll", medirScroll);
      window.removeEventListener("pagehide", enviarSaida);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
  }, [orgId, siteId, paginaId, funilId]);

  return null;
}
