-- Ebooks escritos e diagramados pela Claude (HTML), no lugar do JSON com
-- layouts fixos. Rode no SQL Editor do projeto "Criador de paginas".
--
-- Os ebooks antigos continuam funcionando: motor = 'openai' usa o leitor de
-- sempre; motor = 'claude' usa o HTML da coluna nova.

alter table ebooks add column if not exists motor text not null default 'openai'
  check (motor in ('openai', 'claude'));
alter table ebooks add column if not exists html text;
alter table ebooks add column if not exists modelo_ia text;
-- Quantas páginas o autor pediu (o JSON antigo guardava isso implicitamente).
alter table ebooks add column if not exists paginas_alvo integer not null default 12;

-- Ebooks da Claude nascem prontos para leitura (o texto já vem diagramado);
-- as imagens são geradas depois, quando o dono aprovar.
alter table ebooks drop constraint if exists ebooks_status_check;
alter table ebooks add constraint ebooks_status_check
  check (status in ('gerando', 'pronto', 'erro'));
