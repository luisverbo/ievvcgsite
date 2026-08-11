-- Nome de quem assina a mensagem ("Meu nome é ...").
-- Rode no SQL Editor do projeto "Criador de paginas".

alter table prospeccao_config add column if not exists remetente_nome text;
