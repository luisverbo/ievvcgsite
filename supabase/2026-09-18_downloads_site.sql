-- Quem baixou o site, e quando.
--
-- O botão "Baixar" já existia e não deixava rastro nenhum. Quando um cliente
-- pede reembolso dizendo que não usou, a pergunta mais importante — ele levou
-- o site embora? — não tinha resposta. Agora tem.
--
-- Só o Admin lê (é dado de auditoria, não do cliente): sem política de
-- leitura para `authenticated`, e a gravação passa pelo servidor com a chave
-- de serviço.
--
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.

create table if not exists sites_ia_downloads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) on delete cascade,
  site_ia_id uuid not null references sites_ia(id) on delete cascade,
  -- Quem clicou. Fica nulo se o usuário for apagado depois.
  user_id uuid,
  -- Tamanho do zip entregue: prova de que o download saiu de verdade.
  bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists sites_ia_downloads_org_idx
  on sites_ia_downloads (org_id, created_at desc);
create index if not exists sites_ia_downloads_site_idx
  on sites_ia_downloads (site_ia_id, created_at desc);

alter table sites_ia_downloads enable row level security;
-- Sem política: ninguém lê pelo cliente. O Admin usa a chave de serviço.
