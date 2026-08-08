-- Prospecção: empresas encontradas por busca, com nota de potencial.
-- Rode no SQL Editor do projeto "Criador de paginas".
--
-- A nota NÃO avalia a qualidade do site da empresa — ela mede o quanto vale a
-- pena prospectar. Empresa sem site pontua ALTO (venda fácil); empresa com
-- site moderno pontua baixo (não vale o telefonema).

create table if not exists prospeccao (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) on delete cascade,

  -- identificador na fonte (OpenStreetMap), para não duplicar entre buscas
  fonte text not null default 'osm',
  fonte_id text not null,

  nome text not null,
  categoria text,
  endereco text,
  telefone text,
  website text,
  instagram text,
  facebook text,
  lat double precision,
  lon double precision,

  -- o que foi buscado, para conseguir refazer/filtrar depois
  nicho_busca text,
  local_busca text,

  -- situação digital: define o tamanho da oportunidade
  situacao text not null default 'sem_nada'
    check (situacao in ('sem_nada','social','site_quebrado','site_antigo','site_moderno')),

  pontuacao integer not null default 0,
  eixos jsonb not null default '{}'::jsonb,   -- {situacao, vitalidade, segmento, contato}
  motivos jsonb not null default '[]'::jsonb, -- frases explicando a nota

  -- funil de vendas
  status text not null default 'novo'
    check (status in ('novo','contactado','respondeu','fechou','descartado')),
  anotacao text,
  site_ia_id uuid references sites_ia(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (org_id, fonte, fonte_id)
);

create index if not exists prospeccao_org_idx on prospeccao (org_id, pontuacao desc);
create index if not exists prospeccao_status_idx on prospeccao (org_id, status);
alter table prospeccao enable row level security;

drop policy if exists "prospeccao_all_membro" on prospeccao;
create policy "prospeccao_all_membro" on prospeccao
  for all to authenticated using (is_member(org_id)) with check (is_member(org_id));
