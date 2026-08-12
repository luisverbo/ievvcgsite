-- ============================================================================
-- Agentes dos clientes
-- Rode no SQL Editor do projeto "Criador de paginas".
-- ============================================================================
--
-- Até aqui o agente falava direto com o Supabase usando a service_role — que
-- dá acesso total ao banco de TODO MUNDO. Isso funcionava porque o único
-- agente era o seu, na sua VPS.
--
-- Com clientes rodando o agente na máquina deles, entregar essa chave seria
-- entregar o banco inteiro: qualquer cliente leria os prospectos, as páginas e
-- as chaves de API dos outros.
--
-- Agora cada agente tem um token próprio, que só abre a fila da organização
-- dele, e conversa com o painel por HTTP — nunca direto com o banco.

create table if not exists agentes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) on delete cascade,
  nome text not null default 'Meu computador',

  -- Guardamos o HASH, nunca o token. Se o banco vazar, ninguém consegue se
  -- passar por um agente — e nem nós conseguimos ver o token do cliente.
  token_hash text not null unique,
  -- Últimos 4 caracteres, só para a tela dizer qual token é qual.
  token_final text not null default '',

  ultimo_contato timestamptz,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists agentes_org_idx on agentes (org_id);

alter table agentes enable row level security;

-- O cliente vê os próprios agentes (sem o token, que nem está aqui em claro).
drop policy if exists "meus agentes" on agentes;
create policy "meus agentes" on agentes for select using (is_member(org_id));

drop policy if exists "apagar meus agentes" on agentes;
create policy "apagar meus agentes" on agentes for delete using (is_member(org_id));
