-- ============================================================================
-- Etapa 5: Mensagens com cérebro — a IA escreve uma mensagem por lead
-- Rode no SQL Editor do projeto "Criador de paginas".
-- ============================================================================
--
-- O cliente escreve um briefing (quem ele é, o que oferece, o tom) e, na hora
-- de abordar, pode escolher: o modelo dele com variações — ou a IA escrevendo
-- uma mensagem DIFERENTE para cada lead, usando os dados daquele negócio.
--
-- A coluna `origem` é o placar: com ela dá para dizer "seu modelo converte
-- 11%, as da IA 19%" — comparação honesta, mensagem a mensagem.

alter table prospeccao_config
  add column if not exists briefing_msg text;

alter table prospeccao_mensagens
  add column if not exists origem text not null default 'modelo';
