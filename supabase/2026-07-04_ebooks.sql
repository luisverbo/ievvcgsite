-- Módulo de Ebooks IA (admin) + configurações do sistema (chaves de API).
-- Rode no SQL Editor do projeto "Criador de paginas".

-- Guarda chaves/configurações do dono do sistema. SEM policies de RLS de
-- propósito: com RLS ligada e nenhuma policy, só a service role acessa.
create table if not exists config_sistema (
  chave text primary key,
  valor text not null,
  updated_at timestamptz not null default now()
);
alter table config_sistema enable row level security;

-- Ebooks gerados por IA. Páginas ficam em jsonb:
-- [{ tipo: 'capa'|'conteudo', titulo, texto, prompt_imagem, imagem_url }]
create table if not exists ebooks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) on delete cascade,
  titulo text not null default 'Ebook',
  subtitulo text,
  tema text not null,
  formato text not null default 'a4' check (formato in ('a4', 'mobile', 'quadrado')),
  estilo text not null default 'fotografico',
  status text not null default 'gerando' check (status in ('gerando', 'pronto', 'erro')),
  paginas jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ebooks_org_idx on ebooks (org_id, created_at desc);
alter table ebooks enable row level security;

drop policy if exists "ebooks_all_membro" on ebooks;
create policy "ebooks_all_membro" on ebooks
  for all to authenticated using (is_member(org_id)) with check (is_member(org_id));
