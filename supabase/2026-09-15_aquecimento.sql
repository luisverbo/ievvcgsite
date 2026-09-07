-- Aquecimento de linhas de WhatsApp.
--
-- Um número novo (ou recém-restringido) que sai mandando mensagem para
-- desconhecidos é o retrato do spam para o WhatsApp. Aquecer é dar a ele
-- histórico de conversa comum antes: as linhas da própria conta trocam
-- mensagens entre si (e, se o dono quiser, num grupo com todas), em ritmo de
-- gente, nas horas de gente, por alguns dias.
--
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.

-- Cada linha precisa saber o próprio número: é para ele que as outras mandam.
alter table whatsapp_linhas
  add column if not exists telefone text;

-- A configuração do aquecimento vive na config de prospecção da conta.
alter table prospeccao_config
  add column if not exists aquecimento_ate timestamptz,
  add column if not exists aquecimento_por_hora int not null default 4,
  add column if not exists aquecimento_grupo text,
  add column if not exists aquecimento_ultimo_em timestamptz;

-- Mensagem para um GRUPO (pelo nome), em vez de um número.
alter table prospeccao_mensagens
  add column if not exists grupo text;

-- O tipo novo de mensagem.
alter table prospeccao_mensagens
  drop constraint if exists prospeccao_mensagens_tipo_check;
alter table prospeccao_mensagens
  add constraint prospeccao_mensagens_tipo_check
    check (tipo in ('abordagem', 'fechamento', 'followup', 'gancho', 'apresentacao', 'reenvio', 'teste', 'aquecimento'));
