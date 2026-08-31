-- Filtros da busca no Google Maps.
--
-- O que o cliente pede na tela (só quem não tem site, só quem tem WhatsApp,
-- de 10 a 300 avaliações, nota 4+) precisa viajar até o agente, que é quem
-- abre as fichas e decide o que gravar. Uma coluna jsonb porque o conjunto de
-- filtros vai crescer, e cada filtro novo não pode custar uma migração.
--
-- Nulo = sem filtro. Buscas antigas continuam válidas sem tocar em nada.

alter table public.prospeccao_tarefas
  add column if not exists filtros jsonb;

comment on column public.prospeccao_tarefas.filtros is
  'Filtros da busca: {site, soWhatsapp, minAvaliacoes, maxAvaliacoes, minNota}. Nulo = sem filtro.';
