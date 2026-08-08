-- Liga a página de IA de volta à empresa que originou ela.
-- Rode no SQL Editor do projeto "Criador de paginas".
--
-- O vínculo já existia num sentido (prospeccao.site_ia_id). Faltava o outro:
-- abrindo o site, saber de qual empresa ele é — sem isso a página vira órfã e
-- você perde o contato de quem ia comprar.

alter table sites_ia add column if not exists prospecto_id uuid
  references prospeccao(id) on delete set null;

create index if not exists sites_ia_prospecto_idx on sites_ia (prospecto_id);
