-- Adiciona textos editáveis do site e o ID do Pixel do Facebook.
-- Rode uma vez no SQL Editor do Supabase.

alter table config_evento
  add column if not exists textos jsonb not null default '{}'::jsonb,
  add column if not exists facebook_pixel_id text;
