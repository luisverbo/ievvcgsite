-- Tema por página: quando null, a página herda as cores/fontes do site.
-- Rode no SQL Editor do projeto "Criador de paginas".

alter table paginas add column if not exists tema jsonb;
