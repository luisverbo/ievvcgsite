-- Construtor de páginas com IA (Claude) — módulo do dono do sistema.
-- Rode no SQL Editor do projeto "Criador de paginas".
--
-- Aqui a IA escreve o HTML/CSS/JS inteiro da página (sem blocos), e a edição
-- acontece por conversa. Por isso guardamos três coisas:
--   sites_ia           -> a página atual (HTML que está valendo)
--   sites_ia_versoes   -> todo HTML já salvo, para voltar atrás
--   sites_ia_mensagens -> o histórico do chat, para a conversa sobreviver ao F5

create table if not exists sites_ia (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) on delete cascade,
  titulo text not null default 'Página sem título',
  -- endereço público em /ia/<slug>
  slug text not null unique,
  html text not null default '',
  modelo text not null default 'claude-fable-5',
  publicado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sites_ia_org_idx on sites_ia (org_id, updated_at desc);
alter table sites_ia enable row level security;

drop policy if exists "sites_ia_all_membro" on sites_ia;
create policy "sites_ia_all_membro" on sites_ia
  for all to authenticated using (is_member(org_id)) with check (is_member(org_id));

-- Cada salvamento vira uma versão. Nunca sobrescrevemos: dá para voltar
-- para qualquer ponto da conversa.
create table if not exists sites_ia_versoes (
  id uuid primary key default gen_random_uuid(),
  site_ia_id uuid not null references sites_ia(id) on delete cascade,
  org_id uuid not null references organizacoes(id) on delete cascade,
  html text not null,
  resumo text, -- o que mudou nesta versão, escrito pela IA
  created_at timestamptz not null default now()
);
create index if not exists sites_ia_versoes_idx
  on sites_ia_versoes (site_ia_id, created_at desc);
alter table sites_ia_versoes enable row level security;

drop policy if exists "sites_ia_versoes_all_membro" on sites_ia_versoes;
create policy "sites_ia_versoes_all_membro" on sites_ia_versoes
  for all to authenticated using (is_member(org_id)) with check (is_member(org_id));

-- Histórico do chat. `anexos` guarda o que foi enviado junto da mensagem:
-- [{ tipo: 'imagem'|'pdf', nome, url }]
create table if not exists sites_ia_mensagens (
  id uuid primary key default gen_random_uuid(),
  site_ia_id uuid not null references sites_ia(id) on delete cascade,
  org_id uuid not null references organizacoes(id) on delete cascade,
  papel text not null check (papel in ('user', 'assistant')),
  conteudo text not null default '',
  anexos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists sites_ia_mensagens_idx
  on sites_ia_mensagens (site_ia_id, created_at);
alter table sites_ia_mensagens enable row level security;

drop policy if exists "sites_ia_mensagens_all_membro" on sites_ia_mensagens;
create policy "sites_ia_mensagens_all_membro" on sites_ia_mensagens
  for all to authenticated using (is_member(org_id)) with check (is_member(org_id));
