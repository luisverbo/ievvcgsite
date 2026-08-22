-- ============================================================================
-- Etiquetas nos leads
-- Rode no SQL Editor do projeto "Criador de paginas".
-- ============================================================================
--
-- O status (novo → contactado → respondeu → fechou) é o FUNIL e continua
-- automático. A etiqueta é a OPINIÃO de quem vende: "quente", "ligar sexta",
-- "pediu proposta" — coisa que só a pessoa sabe. Um texto curto e livre por
-- lead, com atalhos prontos na tela; dá para filtrar por ela.

alter table prospeccao
  add column if not exists etiqueta text;
