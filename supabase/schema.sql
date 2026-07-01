-- Festa das Nações 2026 — schema
-- Rode este arquivo inteiro no SQL Editor do Supabase (Database → SQL Editor → New query).
-- Depois rode seed.sql para popular com os dados iniciais da prévia.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- config_evento (linha única com os dados gerais do evento)
-- ---------------------------------------------------------------------------
create table if not exists config_evento (
  id uuid primary key default gen_random_uuid(),
  titulo_hero text not null default 'FESTA DAS NAÇÕES',
  subtitulo_hero text not null default '',
  video_hero_url text,
  texto_sobre text not null default '',
  data_evento timestamptz not null default '2026-07-17T18:00:00-03:00',
  preco_ingresso numeric(10, 2) not null default 12.50,
  link_compra text,
  endereco text not null default '',
  telefone text,
  email text,
  instagram_url text,
  facebook_url text,
  site_url text,
  whatsapp_numero text,
  botao_lineup_texto text not null default 'Ver line-up',
  botao_lineup_visivel boolean not null default true,
  logo_url text,
  tema jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- artistas (line-up)
-- ---------------------------------------------------------------------------
create table if not exists artistas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  estilo text not null,
  pais text not null,
  descricao text not null default '',
  foto_url text,
  video_url text,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- programacao (itens por dia)
-- ---------------------------------------------------------------------------
create table if not exists programacao (
  id uuid primary key default gen_random_uuid(),
  dia text not null,
  horario text not null,
  descricao text not null,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- comidas (stands típicos)
-- ---------------------------------------------------------------------------
create table if not exists comidas (
  id uuid primary key default gen_random_uuid(),
  pais text not null,
  prato text not null,
  emoji text not null default '🍽️',
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- galeria (fotos de edições anteriores)
-- ---------------------------------------------------------------------------
create table if not exists galeria (
  id uuid primary key default gen_random_uuid(),
  imagem_url text not null,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- faq
-- ---------------------------------------------------------------------------
create table if not exists faq (
  id uuid primary key default gen_random_uuid(),
  pergunta text not null,
  resposta text not null,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- patrocinadores
-- ---------------------------------------------------------------------------
create table if not exists patrocinadores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  logo_url text,
  link_url text,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS: leitura pública em todas, escrita só para usuários autenticados
-- ---------------------------------------------------------------------------
alter table config_evento enable row level security;
alter table artistas enable row level security;
alter table programacao enable row level security;
alter table comidas enable row level security;
alter table galeria enable row level security;
alter table faq enable row level security;
alter table patrocinadores enable row level security;

drop policy if exists "config_evento_select_public" on config_evento;
drop policy if exists "config_evento_insert_auth" on config_evento;
drop policy if exists "config_evento_update_auth" on config_evento;
drop policy if exists "config_evento_delete_auth" on config_evento;
create policy "config_evento_select_public" on config_evento for select using (true);
create policy "config_evento_insert_auth" on config_evento for insert to authenticated with check (true);
create policy "config_evento_update_auth" on config_evento for update to authenticated using (true) with check (true);
create policy "config_evento_delete_auth" on config_evento for delete to authenticated using (true);

drop policy if exists "artistas_select_public" on artistas;
drop policy if exists "artistas_insert_auth" on artistas;
drop policy if exists "artistas_update_auth" on artistas;
drop policy if exists "artistas_delete_auth" on artistas;
create policy "artistas_select_public" on artistas for select using (true);
create policy "artistas_insert_auth" on artistas for insert to authenticated with check (true);
create policy "artistas_update_auth" on artistas for update to authenticated using (true) with check (true);
create policy "artistas_delete_auth" on artistas for delete to authenticated using (true);

drop policy if exists "programacao_select_public" on programacao;
drop policy if exists "programacao_insert_auth" on programacao;
drop policy if exists "programacao_update_auth" on programacao;
drop policy if exists "programacao_delete_auth" on programacao;
create policy "programacao_select_public" on programacao for select using (true);
create policy "programacao_insert_auth" on programacao for insert to authenticated with check (true);
create policy "programacao_update_auth" on programacao for update to authenticated using (true) with check (true);
create policy "programacao_delete_auth" on programacao for delete to authenticated using (true);

drop policy if exists "comidas_select_public" on comidas;
drop policy if exists "comidas_insert_auth" on comidas;
drop policy if exists "comidas_update_auth" on comidas;
drop policy if exists "comidas_delete_auth" on comidas;
create policy "comidas_select_public" on comidas for select using (true);
create policy "comidas_insert_auth" on comidas for insert to authenticated with check (true);
create policy "comidas_update_auth" on comidas for update to authenticated using (true) with check (true);
create policy "comidas_delete_auth" on comidas for delete to authenticated using (true);

drop policy if exists "galeria_select_public" on galeria;
drop policy if exists "galeria_insert_auth" on galeria;
drop policy if exists "galeria_update_auth" on galeria;
drop policy if exists "galeria_delete_auth" on galeria;
create policy "galeria_select_public" on galeria for select using (true);
create policy "galeria_insert_auth" on galeria for insert to authenticated with check (true);
create policy "galeria_update_auth" on galeria for update to authenticated using (true) with check (true);
create policy "galeria_delete_auth" on galeria for delete to authenticated using (true);

drop policy if exists "faq_select_public" on faq;
drop policy if exists "faq_insert_auth" on faq;
drop policy if exists "faq_update_auth" on faq;
drop policy if exists "faq_delete_auth" on faq;
create policy "faq_select_public" on faq for select using (true);
create policy "faq_insert_auth" on faq for insert to authenticated with check (true);
create policy "faq_update_auth" on faq for update to authenticated using (true) with check (true);
create policy "faq_delete_auth" on faq for delete to authenticated using (true);

drop policy if exists "patrocinadores_select_public" on patrocinadores;
drop policy if exists "patrocinadores_insert_auth" on patrocinadores;
drop policy if exists "patrocinadores_update_auth" on patrocinadores;
drop policy if exists "patrocinadores_delete_auth" on patrocinadores;
create policy "patrocinadores_select_public" on patrocinadores for select using (true);
create policy "patrocinadores_insert_auth" on patrocinadores for insert to authenticated with check (true);
create policy "patrocinadores_update_auth" on patrocinadores for update to authenticated using (true) with check (true);
create policy "patrocinadores_delete_auth" on patrocinadores for delete to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Storage: bucket público "midias" para fotos e vídeos, upload só autenticado
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('midias', 'midias', true)
on conflict (id) do nothing;

drop policy if exists "midias_select_public" on storage.objects;
drop policy if exists "midias_insert_auth" on storage.objects;
drop policy if exists "midias_update_auth" on storage.objects;
drop policy if exists "midias_delete_auth" on storage.objects;
create policy "midias_select_public" on storage.objects for select using (bucket_id = 'midias');
create policy "midias_insert_auth" on storage.objects for insert to authenticated with check (bucket_id = 'midias');
create policy "midias_update_auth" on storage.objects for update to authenticated using (bucket_id = 'midias') with check (bucket_id = 'midias');
create policy "midias_delete_auth" on storage.objects for delete to authenticated using (bucket_id = 'midias');
