-- O freio de mão do envio.
--
-- Depois de mandar a fila para o agente não havia como parar: o jeito era
-- cancelar mensagem por mensagem, ou desconectar o WhatsApp inteiro (que
-- apaga a sessão e obriga a ler o QR de novo). Faltava simplesmente PARAR.
--
-- A trava mora no servidor, não no agente: com o envio pausado a fila não é
-- entregue a agente nenhum, nem aos que ainda não foram atualizados.

alter table prospeccao_config
  add column if not exists envio_pausado boolean not null default false,
  -- Desde quando está parado — o painel mostra, e é o registro de quem
  -- pausou e esqueceu de retomar.
  add column if not exists envio_pausado_em timestamptz;
