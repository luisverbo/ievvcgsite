-- ============================================================================
-- Etapa 7: O Espelho — o site atual do lead ao lado do que ele pode ter
-- Rode no SQL Editor do projeto "Criador de paginas".
-- ============================================================================
--
-- O agente tira um print do site ATUAL do lead (o antigo, o quebrado) e o
-- painel monta a página "hoje × amanhã": de um lado a foto do que ele tem,
-- do outro o site novo, vivo. Nenhum argumento de venda supera colocar os
-- dois lado a lado.

alter table prospeccao
  add column if not exists espelho_url text,
  add column if not exists espelho_em timestamptz;
