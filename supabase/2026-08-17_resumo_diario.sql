-- ============================================================================
-- Etapa 4: Resumo diário no WhatsApp do dono
-- Rode no SQL Editor do projeto "Criador de paginas".
-- ============================================================================
--
-- Uma vez por dia, no horário escolhido, o agente manda ao PRÓPRIO dono um
-- resumo do trabalho: enviadas, respostas, sites entregues e os leads
-- quentes do Termômetro. Sai do mesmo WhatsApp conectado — para o número
-- que o dono indicar (pode ser o dele mesmo: vira a conversa "você").

alter table prospeccao_config
  add column if not exists resumo_zap text,
  -- Hora local (Brasília) a partir da qual o resumo do dia pode sair.
  add column if not exists resumo_hora smallint not null default 18,
  -- O dia (em Brasília) do último resumo enviado — a trava de "um por dia".
  add column if not exists resumo_ultimo_dia date;
