-- ============================================================================
-- Registrar a fatura de upgrade (a diferença proporcional)
-- Rode no SQL Editor do projeto "Criador de paginas".
-- ============================================================================
--
-- O bug: quem sobe de plano no meio do mês paga uma segunda fatura naquele
-- mesmo mês (o rateio dos dias que faltam). Só que existe uma trava proposital
--
--     unique (org_id, periodo) where tipo = 'assinatura' and status = 'pago'
--
-- que impede o MESMO MÊS de ser pago duas vezes — ela é o que protege o
-- cliente de pagar no Pix um mês que a retentativa do cartão também vai pagar.
--
-- Essa trava barrava a fatura do upgrade em silêncio: o dinheiro entrava na
-- Stripe e nunca aparecia no extrato do cliente. Foi o que aconteceu na
-- primeira troca de plano real.
--
-- A saída não é afrouxar a trava (ela protege dinheiro do cliente), e sim
-- reconhecer que upgrade é outro tipo de cobrança. Com tipo 'upgrade', a
-- fatura entra no extrato e a trava do mês continua valendo inteira para as
-- mensalidades.

alter table pagamentos drop constraint if exists pagamentos_tipo_check;
alter table pagamentos add constraint pagamentos_tipo_check
  check (tipo in ('assinatura', 'credito', 'upgrade'));
