-- Dados do Instagram da empresa, para alimentar o gerador de site.
-- Rode no SQL Editor do projeto "Criador de paginas".
--
-- As fotos ficam como URLs do NOSSO Storage, não do Instagram: os links de
-- imagem deles são assinados e expiram em poucas horas, então guardar o
-- endereço original não serviria de nada.

alter table prospeccao add column if not exists ig_nome text;
alter table prospeccao add column if not exists ig_bio text;
alter table prospeccao add column if not exists ig_seguidores integer;
alter table prospeccao add column if not exists ig_posts integer;
-- [{ url, legenda }] — já baixadas para o Storage
alter table prospeccao add column if not exists ig_fotos jsonb not null default '[]'::jsonb;
alter table prospeccao add column if not exists ig_status text
  check (ig_status in ('ok', 'privado', 'nao_encontrado', 'bloqueado', 'erro'));
alter table prospeccao add column if not exists ig_erro text;
alter table prospeccao add column if not exists ig_capturado_em timestamptz;

-- A captura entra na mesma fila das buscas, com um tipo próprio.
alter table prospeccao_tarefas add column if not exists tipo text not null default 'busca';
alter table prospeccao_tarefas add column if not exists prospecto_id uuid
  references prospeccao(id) on delete cascade;

-- 'nicho' e 'local' não fazem sentido numa tarefa de Instagram.
alter table prospeccao_tarefas alter column nicho drop not null;
alter table prospeccao_tarefas alter column local drop not null;
