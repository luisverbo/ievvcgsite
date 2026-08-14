-- ============================================================================
-- Cota de IA do plano grátis (a degustação de 1 página)
-- Rode no SQL Editor do projeto "Criador de paginas".
-- ============================================================================
--
-- O bug que isto corrige: organizacoes.cota_mensal nascia com default 0, e a
-- função renovar_cota ignora cota <= 0. Resultado: toda conta nova entrava
-- sem NENHUM crédito de IA — a degustação do plano grátis nunca funcionaria,
-- nem com o interruptor ligado.
--
-- US$1,50 (1.500.000 microdólares) é o suficiente para UMA geração completa
-- de página, mesmo no modelo mais caro (~US$1,06). Precisa bater com
-- PLANOS.free.cota em lib/painel/permissoes.ts.

alter table organizacoes alter column cota_mensal set default 1500000;

-- Contas grátis que já nasceram com 0 recebem a cota certa. As pagas não são
-- tocadas: a delas vem do webhook, com o valor do plano.
update organizacoes set cota_mensal = 1500000 where plano = 'free' and cota_mensal = 0;
