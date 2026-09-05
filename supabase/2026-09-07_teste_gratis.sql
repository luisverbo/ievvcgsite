-- Teste grátis do Prospector: 7 dias, sem cartão, com teto por dia.
--
-- Um plano novo, 'teste', que dá a prospecção inteira (o agente, o WhatsApp,
-- o funil) com dois freios: 30 empresas encontradas e 30 envios por dia. Não
-- custa nada ao dono — o Prospector não gasta IA — e vira uma campanha de
-- entrada. Quando teste_ate passa, o plano vigente cai para 'free' e o painel
-- pede a assinatura; quem paga vira 'prospector' pelo webhook de sempre.

alter table organizacoes drop constraint if exists organizacoes_plano_check;
alter table organizacoes add constraint organizacoes_plano_check
  check (plano in ('free', 'pro', 'agencia', 'prospector', 'teste'));

alter table organizacoes
  -- Até quando o teste vale. Fica gravado mesmo depois: é o que impede um
  -- segundo teste na mesma conta.
  add column if not exists teste_ate timestamptz;
