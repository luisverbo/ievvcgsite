-- Ebooks v2: escolha do modelo de texto e da qualidade da imagem.
-- Rode no SQL Editor do projeto "Criador de paginas".

alter table ebooks add column if not exists modelo_texto text not null default 'gpt-4o';
alter table ebooks add column if not exists qualidade_imagem text not null default 'media'
  check (qualidade_imagem in ('media', 'alta'));
