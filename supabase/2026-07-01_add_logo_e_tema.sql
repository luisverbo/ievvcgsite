-- Adiciona logo e personalização de tema (cores + fontes) ao config_evento.
-- Rode uma vez no SQL Editor do Supabase.

alter table config_evento
  add column if not exists logo_url text,
  add column if not exists tema jsonb not null default '{}'::jsonb;
