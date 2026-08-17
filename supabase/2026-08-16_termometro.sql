-- ============================================================================
-- Etapa 3 do Fechador: o Termômetro — quem abriu o site, quantas vezes
-- Rode no SQL Editor do projeto "Criador de paginas".
-- ============================================================================
--
-- O link que o Fechador envia é ÚNICO por lead (/p/codigo). Cada abertura
-- real vira uma linha aqui — já filtrada de robô de prévia do WhatsApp, do
-- dono logado e de recarga em sequência. É o que permite dizer "abriu 3×
-- hoje, a última há 20 minutos: liga AGORA".

alter table prospeccao
  add column if not exists link_codigo text unique;

create table if not exists prospeccao_aberturas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) on delete cascade,
  prospecto_id uuid not null references prospeccao(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Começo do user-agent, só para diagnóstico ("abriu do celular?").
  navegador text
);

create index if not exists prospeccao_aberturas_prospecto_idx
  on prospeccao_aberturas (prospecto_id, created_at desc);
create index if not exists prospeccao_aberturas_org_idx
  on prospeccao_aberturas (org_id, created_at desc);

alter table prospeccao_aberturas enable row level security;
drop policy if exists "minhas aberturas" on prospeccao_aberturas;
create policy "minhas aberturas" on prospeccao_aberturas
  for select using (is_member(org_id));
