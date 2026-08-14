-- ============================================================================
-- Cota de hospedagem: sites inclusos no plano + sites extras pagos
-- Rode no SQL Editor do projeto "Criador de paginas".
-- ============================================================================
--
-- Cada plano inclui um número de sites hospedados (Pro 3, Agência 10). Acima
-- disso o cliente contrata sites extras, cobrados por mês na mesma assinatura
-- do cartão — a Stripe cuida do rateio dos dias.
--
-- Duas colunas em vez de uma, de propósito:
--
--   sites_extras_pagos     espelha a quantidade que está na assinatura da
--                          Stripe. Quem mexe aqui é o sistema, nunca a mão.
--   sites_extras_cortesia  o que VOCÊ libera de graça (um cliente grande, um
--                          acordo, um teste). Nunca é sincronizado com a
--                          Stripe, então uma reconciliação não apaga o acordo.
--
-- Somadas com o que o plano inclui, dão o teto de sites daquela organização.

alter table organizacoes
  add column if not exists sites_extras_pagos int not null default 0
    check (sites_extras_pagos >= 0),
  add column if not exists sites_extras_cortesia int not null default 0
    check (sites_extras_cortesia >= 0);

comment on column organizacoes.sites_extras_pagos is
  'Sites extras cobrados na assinatura da Stripe. Espelho da quantidade do item de assinatura — não editar na mão.';
comment on column organizacoes.sites_extras_cortesia is
  'Sites extras liberados sem cobrança. Editável na mão; a sincronização com a Stripe nunca mexe aqui.';
