-- Horário de envio.
--
-- A fila não deveria virar a noite mandando mensagem: quando o dia vira e
-- ainda há mensagens esperando, o agente recomeçava à meia-noite. Agora a
-- conta tem uma JANELA (hora de início, hora de fim, dias da semana, em
-- Brasília) e o servidor só entrega mensagem de prospecção dentro dela.
--
-- O que fura a janela, de propósito: a apresentação (resposta a quem acabou
-- de responder — gente responde na hora) e o teste de envio (diagnóstico).
-- O aquecimento entre as linhas usa a mesma janela.
--
-- Padrão: 8h às 20h, segunda a sexta. Ajuste em Prospecção › Abordagem.
--
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.

alter table prospeccao_config
  add column if not exists envio_hora_inicio int not null default 8,
  add column if not exists envio_hora_fim int not null default 20,
  -- Dias da semana permitidos, 0 = domingo … 6 = sábado, separados por vírgula.
  add column if not exists envio_dias text not null default '1,2,3,4,5';
