-- Por que a fila não anda: o motivo, guardado.
--
-- "O WhatsApp está conectado e a mensagem não sai" era impossível de
-- responder olhando a tela: o servidor decide se a linha pode enviar (é a vez
-- dela? está dentro do intervalo? bateu o limite? o agente dela está vivo?) e
-- respondia isso só para o agente, que registrava no log da VPS.
--
-- Agora a última resposta dada ao agente fica aqui, e o painel mostra em
-- português. Um campo de texto e a hora — é diagnóstico, não histórico.

alter table prospeccao_config
  add column if not exists ultimo_motivo text,
  add column if not exists ultimo_motivo_em timestamptz;
