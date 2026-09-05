-- Avisos do dono no WhatsApp: "alguém entrou no teste", "alguém comprou".
--
-- Uma fila de mensagens curtas para o número do dono, entregue pelo agente da
-- organização dele (o mesmo caminho do resumo diário — o agente já sabe
-- mandar mensagem para o próprio dono, sem API paga). O painel enfileira; o
-- agente, na próxima volta, envia.

create table if not exists avisos_zap (
  id uuid primary key default gen_random_uuid(),
  -- A organização cujo agente vai enviar (a do dono do sistema).
  org_id uuid not null references organizacoes(id) on delete cascade,
  telefone text not null,
  texto text not null,
  -- pendente → enviado (o agente pegou); volta a pendente se o envio falhar.
  status text not null default 'pendente' check (status in ('pendente', 'enviado')),
  created_at timestamptz not null default now(),
  enviado_em timestamptz
);

create index if not exists avisos_zap_fila on avisos_zap (org_id, status, created_at);

-- Só o servidor (service_role) escreve e lê; nenhum cliente enxerga isto.
alter table avisos_zap enable row level security;
