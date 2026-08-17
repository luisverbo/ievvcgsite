-- ============================================================================
-- Etapa 8: Otimizador de páginas — a IA lê as métricas e sugere melhorias
-- Rode no SQL Editor do projeto "Criador de paginas".
-- ============================================================================
--
-- As sugestões ficam gravadas na própria página: [{titulo, motivo, pedido}].
-- O "pedido" é a instrução pronta para o chat do construtor — o botão
-- Aplicar abre o chat com ela preenchida, o dono revisa e envia.

alter table sites_ia
  add column if not exists otimizacoes jsonb,
  add column if not exists otimizadas_em timestamptz;
