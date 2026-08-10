-- Dados que só o Google tem: avaliações e nota. É o sinal mais forte de
-- "negócio vivo e que se importa" — o eixo de vitalidade passa a usar isto
-- quando existir, e cai no cálculo antigo (cadastro preenchido) quando não.
-- Rode no SQL Editor do projeto "Criador de paginas".

alter table prospeccao add column if not exists avaliacoes integer;
alter table prospeccao add column if not exists nota_media numeric(2,1);
alter table prospeccao add column if not exists fonte_url text;

-- A busca do agente local grava com fonte = 'google'; a do painel, 'osm'.
-- A chave única (org_id, fonte, fonte_id) já separa as duas sem conflito.
