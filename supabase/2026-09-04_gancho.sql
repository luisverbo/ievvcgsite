-- Abordagem em dois passos: GANCHO + APRESENTAÇÃO.
--
-- A mensagem longa de abordagem chega inteira no preview da notificação e
-- entrega o disparo antes de ser aberta. Neste modo o agente manda primeiro
-- uma linha curta (o gancho); só quem responde recebe a apresentação — que
-- é enfileirada pelo servidor na hora em que a escuta detecta a resposta.
--
-- A abordagem direta (uma mensagem só) continua existindo. É uma OPÇÃO por
-- conta, guardada em prospeccao_config.abordagem_modo.

alter table prospeccao_config
  -- 'direta' = a de sempre; 'gancho' = gancho + apresentação.
  add column if not exists abordagem_modo text not null default 'direta'
    check (abordagem_modo in ('direta', 'gancho')),
  -- O texto do gancho (curto; aceita [a|b] e {empresa}).
  add column if not exists gancho_msg_modelo text,
  -- A apresentação que sai depois que o lead responde ao gancho.
  add column if not exists apresentacao_msg_modelo text;

-- A fila ganha dois tipos novos.
alter table prospeccao_mensagens
  drop constraint if exists prospeccao_mensagens_tipo_check;
alter table prospeccao_mensagens
  add constraint prospeccao_mensagens_tipo_check
    check (tipo in ('abordagem', 'fechamento', 'followup', 'gancho', 'apresentacao'));

-- Um gancho por prospecto e uma apresentação por prospecto, para sempre —
-- a mesma rede de segurança da abordagem: robô não martela lead.
create unique index if not exists prospeccao_mensagens_gancho_uk
  on prospeccao_mensagens (org_id, prospecto_id)
  where tipo = 'gancho';
create unique index if not exists prospeccao_mensagens_apresentacao_uk
  on prospeccao_mensagens (org_id, prospecto_id)
  where tipo = 'apresentacao';
