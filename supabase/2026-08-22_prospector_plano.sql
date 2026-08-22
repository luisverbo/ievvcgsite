-- ============================================================================
-- Prospector: o banco precisa ACEITAR o plano novo
-- Rode no SQL Editor do projeto "Criador de paginas".
-- ============================================================================
--
-- As duas tabelas têm um CHECK antigo que só conhece free/pro/agencia — o
-- botão do Admin clicava, o banco recusava e nada acontecia (sem erro na
-- tela, que era o pior sintoma possível). O webhook da Stripe esbarraria na
-- mesma trava ao gravar a assinatura.

alter table organizacoes drop constraint if exists organizacoes_plano_check;
alter table organizacoes add constraint organizacoes_plano_check
  check (plano in ('free', 'pro', 'agencia', 'prospector'));

alter table assinaturas drop constraint if exists assinaturas_plano_check;
alter table assinaturas add constraint assinaturas_plano_check
  check (plano in ('pro', 'agencia', 'prospector'));
