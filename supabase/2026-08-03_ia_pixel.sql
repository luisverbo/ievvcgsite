-- Pixel e tags nas páginas do construtor com IA.
-- Rode no SQL Editor do projeto "Criador de paginas".
--
-- Ficam em colunas separadas (e não dentro do HTML) de propósito: assim dá
-- para colocar/trocar o pixel de uma página JÁ CRIADA sem a IA reescrever
-- nada. A injeção acontece na hora de servir a página.

alter table sites_ia add column if not exists facebook_pixel_id text;
alter table sites_ia add column if not exists codigo_head text;
