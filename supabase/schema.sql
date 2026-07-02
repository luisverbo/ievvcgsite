-- ============================================================================
-- PáginaPro — schema multi-tenant (Fase 0)
-- Rode este arquivo inteiro no SQL Editor do NOVO projeto Supabase.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Organizações e membros
-- ----------------------------------------------------------------------------
create table if not exists organizacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  plano text not null default 'free' check (plano in ('free', 'pro')),
  created_at timestamptz not null default now()
);

create table if not exists membros (
  org_id uuid not null references organizacoes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  papel text not null default 'dono' check (papel in ('dono', 'editor')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- Checa se o usuário logado é membro da organização. SECURITY DEFINER para
-- não recair em recursão de RLS ao ser usada dentro das policies.
create or replace function public.is_member(org uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from membros where org_id = org and user_id = auth.uid()
  );
$$;

-- ----------------------------------------------------------------------------
-- Sites (cada site = um subdomínio)
-- ----------------------------------------------------------------------------
create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) on delete cascade,
  slug text not null unique
    check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,40})[a-z0-9]$'),
  nome text not null,
  tema jsonb not null default '{}'::jsonb,
  logo_url text,
  whatsapp_numero text,
  facebook_pixel_id text,
  publicado boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists sites_org_idx on sites (org_id);

-- Subdomínios reservados do próprio produto
create or replace function public.slug_reservado(s text)
returns boolean language sql immutable as $$
  select s in ('www','app','api','admin','mail','ftp','blog','ajuda','suporte',
               'painel','login','cadastro','assets','cdn','static','docs');
$$;

-- ----------------------------------------------------------------------------
-- Páginas e blocos
-- ----------------------------------------------------------------------------
create table if not exists funis (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);
create index if not exists funis_site_idx on funis (site_id);

create table if not exists paginas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  slug text not null default '' check (slug = '' or slug ~ '^[a-z0-9][a-z0-9-]{0,60}$'),
  titulo text not null default 'Página',
  descricao_seo text,
  og_image_url text,
  funil_id uuid references funis(id) on delete set null,
  etapa_ordem int,
  publicado boolean not null default false,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  unique (site_id, slug)
);
create index if not exists paginas_site_idx on paginas (site_id);

create table if not exists blocos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) on delete cascade,
  pagina_id uuid not null references paginas(id) on delete cascade,
  tipo text not null,
  config jsonb not null default '{}'::jsonb,
  ordem int not null default 0,
  oculto boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists blocos_pagina_idx on blocos (pagina_id);

-- ----------------------------------------------------------------------------
-- Templates (catálogo público, gerenciado pelo produto via service role)
-- ----------------------------------------------------------------------------
create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,
  nicho text not null,
  nome text not null,
  descricao text,
  preview_url text,
  tema jsonb not null default '{}'::jsonb,
  blocos jsonb not null default '[]'::jsonb,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Leads (formulários de captura) e métricas
-- ----------------------------------------------------------------------------
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  pagina_id uuid references paginas(id) on delete set null,
  dados jsonb not null default '{}'::jsonb,
  origem text,
  created_at timestamptz not null default now()
);
create index if not exists leads_site_idx on leads (site_id, created_at);

create table if not exists analytics_eventos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  site_id uuid not null,
  pagina_id uuid,
  funil_id uuid,
  tipo text not null check (tipo in ('pageview', 'click')),
  rotulo text,
  path text,
  referrer text,
  origem text,
  created_at timestamptz not null default now()
);
create index if not exists analytics_site_created_idx on analytics_eventos (site_id, created_at);

-- ----------------------------------------------------------------------------
-- RPC: cria organização + membro dono + primeiro site numa transação
-- ----------------------------------------------------------------------------
create or replace function public.criar_organizacao_com_site(
  nome_org text,
  nome_site text,
  slug_site text
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  novo_org uuid;
  novo_site uuid;
begin
  if auth.uid() is null then
    raise exception 'É preciso estar logado.';
  end if;
  if slug_reservado(slug_site) then
    raise exception 'Este endereço não está disponível.';
  end if;

  insert into organizacoes (nome) values (nome_org) returning id into novo_org;
  insert into membros (org_id, user_id, papel) values (novo_org, auth.uid(), 'dono');
  insert into sites (org_id, slug, nome)
    values (novo_org, slug_site, nome_site) returning id into novo_site;
  -- Página inicial vazia, já criada como rascunho
  insert into paginas (org_id, site_id, slug, titulo)
    values (novo_org, novo_site, '', 'Página inicial');

  return novo_site;
end;
$$;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table organizacoes enable row level security;
alter table membros enable row level security;
alter table sites enable row level security;
alter table funis enable row level security;
alter table paginas enable row level security;
alter table blocos enable row level security;
alter table templates enable row level security;
alter table leads enable row level security;
alter table analytics_eventos enable row level security;

-- organizações: só membros veem/alteram
drop policy if exists "org_select_membro" on organizacoes;
drop policy if exists "org_update_dono" on organizacoes;
create policy "org_select_membro" on organizacoes
  for select to authenticated using (is_member(id));
create policy "org_update_dono" on organizacoes
  for update to authenticated using (is_member(id)) with check (is_member(id));

-- membros: usuário vê os próprios vínculos e os das orgs de que participa
drop policy if exists "membros_select" on membros;
create policy "membros_select" on membros
  for select to authenticated using (user_id = auth.uid() or is_member(org_id));

-- sites: público lê publicado; membro lê/escreve tudo da org
drop policy if exists "sites_select_publico" on sites;
drop policy if exists "sites_select_membro" on sites;
drop policy if exists "sites_write_membro" on sites;
drop policy if exists "sites_update_membro" on sites;
drop policy if exists "sites_delete_membro" on sites;
create policy "sites_select_publico" on sites for select using (publicado);
create policy "sites_select_membro" on sites
  for select to authenticated using (is_member(org_id));
create policy "sites_write_membro" on sites
  for insert to authenticated with check (is_member(org_id) and not slug_reservado(slug));
create policy "sites_update_membro" on sites
  for update to authenticated using (is_member(org_id))
  with check (is_member(org_id) and not slug_reservado(slug));
create policy "sites_delete_membro" on sites
  for delete to authenticated using (is_member(org_id));

-- funis / paginas / blocos: mesmo padrão (público lê apenas o publicado)
drop policy if exists "funis_select_membro" on funis;
drop policy if exists "funis_all_membro" on funis;
create policy "funis_select_membro" on funis
  for select to authenticated using (is_member(org_id));
create policy "funis_all_membro" on funis
  for all to authenticated using (is_member(org_id)) with check (is_member(org_id));

drop policy if exists "paginas_select_publico" on paginas;
drop policy if exists "paginas_all_membro" on paginas;
create policy "paginas_select_publico" on paginas
  for select using (
    publicado and exists (select 1 from sites s where s.id = site_id and s.publicado)
  );
create policy "paginas_all_membro" on paginas
  for all to authenticated using (is_member(org_id)) with check (is_member(org_id));

drop policy if exists "blocos_select_publico" on blocos;
drop policy if exists "blocos_all_membro" on blocos;
create policy "blocos_select_publico" on blocos
  for select using (
    not oculto and exists (
      select 1 from paginas p
      join sites s on s.id = p.site_id
      where p.id = pagina_id and p.publicado and s.publicado
    )
  );
create policy "blocos_all_membro" on blocos
  for all to authenticated using (is_member(org_id)) with check (is_member(org_id));

-- templates: leitura pública; escrita só via service role (nenhuma policy)
drop policy if exists "templates_select_publico" on templates;
create policy "templates_select_publico" on templates for select using (ativo);

-- leads: qualquer visitante insere; só membros leem
drop policy if exists "leads_insert_publico" on leads;
drop policy if exists "leads_select_membro" on leads;
drop policy if exists "leads_delete_membro" on leads;
create policy "leads_insert_publico" on leads
  for insert to anon, authenticated with check (true);
create policy "leads_select_membro" on leads
  for select to authenticated using (is_member(org_id));
create policy "leads_delete_membro" on leads
  for delete to authenticated using (is_member(org_id));

-- analytics: qualquer visitante insere; só membros leem
drop policy if exists "analytics_insert_publico" on analytics_eventos;
drop policy if exists "analytics_select_membro" on analytics_eventos;
create policy "analytics_insert_publico" on analytics_eventos
  for insert to anon, authenticated with check (true);
create policy "analytics_select_membro" on analytics_eventos
  for select to authenticated using (is_member(org_id));

-- ----------------------------------------------------------------------------
-- Storage: bucket público "midias"; upload restrito à pasta da própria org
-- (arquivos gravados como {org_id}/{resto do caminho})
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('midias', 'midias', true)
on conflict (id) do nothing;

drop policy if exists "midias_select_publico" on storage.objects;
drop policy if exists "midias_insert_org" on storage.objects;
drop policy if exists "midias_update_org" on storage.objects;
drop policy if exists "midias_delete_org" on storage.objects;
create policy "midias_select_publico" on storage.objects
  for select using (bucket_id = 'midias');
create policy "midias_insert_org" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'midias'
    and is_member(((storage.foldername(name))[1])::uuid)
  );
create policy "midias_update_org" on storage.objects
  for update to authenticated using (
    bucket_id = 'midias'
    and is_member(((storage.foldername(name))[1])::uuid)
  );
create policy "midias_delete_org" on storage.objects
  for delete to authenticated using (
    bucket_id = 'midias'
    and is_member(((storage.foldername(name))[1])::uuid)
  );
