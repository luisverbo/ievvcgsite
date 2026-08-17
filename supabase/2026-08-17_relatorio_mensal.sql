-- ============================================================================
-- Etapa 9: Relatório mensal — o que o cliente final recebe todo mês
-- Rode no SQL Editor do projeto "Criador de paginas".
-- ============================================================================
--
-- O dentista que comprou o site não vê painel nenhum: ele vê a fatura chegar.
-- O relatório é o que transforma a mensalidade em algo visível — "seu site
-- recebeu 143 visitas e 19 pessoas chamaram no WhatsApp". É ferramenta de
-- retenção antes de ser relatório.
--
-- O código é o endereço público: /relatorio/<codigo>. Um por página, criado
-- só quando o dono clica — página sem código não tem relatório no ar.

alter table sites_ia
  add column if not exists relatorio_codigo text unique;
