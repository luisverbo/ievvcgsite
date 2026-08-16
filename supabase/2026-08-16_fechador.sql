-- ============================================================================
-- Etapa 2 do Fechador: o site automático na resposta
-- Rode no SQL Editor do projeto "Criador de paginas".
-- ============================================================================
--
-- Quando o lead responde com interesse, o sistema (conforme o nível escolhido
-- pelo cliente) gera a página daquela empresa com as fotos do Instagram dela
-- e coloca a mensagem com o link na MESMA fila de envio que já existe — o
-- agente que já sabe mandar mensagem é quem entrega.

-- A configuração do Fechador mora junto da configuração de abordagem.
alter table prospeccao_config
  -- desligado: nada além de marcar "respondeu"
  -- avisar:    só o painel destaca — o humano faz o resto
  -- preparar:  gera o site e deixa a mensagem PRONTA para o humano enviar
  -- fechar:    gera e o agente envia sozinho
  add column if not exists fechador_nivel text not null default 'desligado'
    check (fechador_nivel in ('desligado', 'avisar', 'preparar', 'fechar')),

  -- Teto de gasto do mês em microdólares de crédito (US$5 = 5.000.000).
  -- Bateu o teto, o Fechador para de gerar e avisa — robô não estoura cartão.
  add column if not exists fechador_teto_micro bigint not null default 5000000,
  add column if not exists fechador_gasto_micro bigint not null default 0,
  add column if not exists fechador_mes date,

  -- A mensagem que acompanha o link. {empresa} e {link} são trocados na hora.
  add column if not exists fechador_msg_modelo text,

  -- O "de acordo" explícito exigido para o nível 'fechar': mandar mensagem
  -- sozinho no WhatsApp do cliente é decisão dele, datada.
  add column if not exists fechador_autorizado_em timestamptz;

-- A fila de mensagens ganha um tipo: 'abordagem' (a primeira) e 'fechamento'
-- (a do site pronto). A trava "nunca abordar duas vezes" continua valendo —
-- mas só para a abordagem: o fechamento é a SEGUNDA mensagem do mesmo
-- prospecto, por definição.
alter table prospeccao_mensagens
  add column if not exists tipo text not null default 'abordagem'
    check (tipo in ('abordagem', 'fechamento'));

alter table prospeccao_mensagens
  drop constraint if exists prospeccao_mensagens_org_id_prospecto_id_key;
create unique index if not exists prospeccao_mensagens_abordagem_uk
  on prospeccao_mensagens (org_id, prospecto_id)
  where tipo = 'abordagem';
-- E um fechamento por prospecto também — o agente não pode martelar o lead.
create unique index if not exists prospeccao_mensagens_fechamento_uk
  on prospeccao_mensagens (org_id, prospecto_id)
  where tipo = 'fechamento';
