-- Adiciona a origem da visita (Facebook, Instagram, Direto, etc.) às métricas.
-- Rode uma vez no SQL Editor do Supabase (depois do 2026-07-02_analytics.sql).

alter table analytics_eventos
  add column if not exists origem text;
