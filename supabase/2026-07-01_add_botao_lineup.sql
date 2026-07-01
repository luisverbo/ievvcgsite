-- Adiciona controle do botão "Ver line-up" do Hero (texto + mostrar/esconder).
-- Rode uma vez no SQL Editor do Supabase (seu banco já existe, então schema.sql
-- sozinho não adicionaria essas colunas novas).

alter table config_evento
  add column if not exists botao_lineup_texto text not null default 'Ver line-up',
  add column if not exists botao_lineup_visivel boolean not null default true;
