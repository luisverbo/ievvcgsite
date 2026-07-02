-- Métricas próprias: registra visitas (pageview) e cliques em botões.
-- Rode uma vez no SQL Editor do Supabase.

create table if not exists analytics_eventos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('pageview', 'click')),
  rotulo text,        -- qual botão, quando tipo = 'click'
  path text,          -- caminho da página
  referrer text,      -- de onde a pessoa veio (quando pageview)
  created_at timestamptz not null default now()
);

create index if not exists analytics_eventos_created_idx on analytics_eventos (created_at);
create index if not exists analytics_eventos_tipo_idx on analytics_eventos (tipo);

alter table analytics_eventos enable row level security;

-- O site público (anon) só pode INSERIR eventos; ler os dados é só para o
-- admin autenticado.
drop policy if exists "analytics_insert_public" on analytics_eventos;
drop policy if exists "analytics_select_auth" on analytics_eventos;
create policy "analytics_insert_public" on analytics_eventos
  for insert to anon, authenticated with check (true);
create policy "analytics_select_auth" on analytics_eventos
  for select to authenticated using (true);
