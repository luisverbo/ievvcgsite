-- Desconectar o WhatsApp pelo painel (para trocar de número).
-- Rode no SQL Editor do projeto "Criador de paginas".

alter table prospeccao_config
  add column if not exists desconectar_pedido boolean not null default false;
