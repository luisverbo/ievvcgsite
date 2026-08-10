-- Fila de tarefas do agente de prospecção.
-- Rode no SQL Editor do projeto "Criador de paginas".
--
-- O painel cria a tarefa; o agente (na VPS ou no seu computador) fica olhando
-- a fila e executa. O agente NUNCA recebe conexão de fora — ele só consulta o
-- Supabase. Por isso o mesmo código roda em qualquer lugar, sem abrir porta,
-- sem IP fixo e sem domínio.

create table if not exists prospeccao_tarefas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) on delete cascade,

  nicho text not null,
  local text not null,
  limite integer not null default 20,

  status text not null default 'pendente'
    check (status in ('pendente', 'rodando', 'concluida', 'erro', 'cancelada')),
  progresso integer not null default 0,   -- empresas já lidas
  total integer not null default 0,       -- empresas encontradas na lista
  gravadas integer not null default 0,
  erro text,
  agente text,                            -- quem pegou a tarefa (hostname)

  created_at timestamptz not null default now(),
  iniciada_em timestamptz,
  concluida_em timestamptz
);

create index if not exists prospeccao_tarefas_fila_idx
  on prospeccao_tarefas (status, created_at);
create index if not exists prospeccao_tarefas_org_idx
  on prospeccao_tarefas (org_id, created_at desc);

alter table prospeccao_tarefas enable row level security;

drop policy if exists "prospeccao_tarefas_all_membro" on prospeccao_tarefas;
create policy "prospeccao_tarefas_all_membro" on prospeccao_tarefas
  for all to authenticated using (is_member(org_id)) with check (is_member(org_id));
