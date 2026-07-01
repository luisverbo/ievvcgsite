-- Festa das Nações 2026 — seed
-- Rode depois de schema.sql, no SQL Editor do Supabase.
-- Popula as tabelas com os dados iniciais da prévia aprovada.
-- Seguro rodar mais de uma vez: limpa as tabelas de conteúdo antes de inserir.

truncate table artistas, programacao, comidas, faq restart identity cascade;
delete from config_evento;

insert into config_evento (
  titulo_hero, subtitulo_hero, texto_sobre, data_evento, preco_ingresso,
  link_compra, endereco, telefone, email, instagram_url, facebook_url,
  site_url, whatsapp_numero
) values (
  'FESTA DAS NAÇÕES',
  'Uma viagem gastronômica e musical ao redor do mundo — comida típica, shows gospel ao vivo, área kids e bazar.',
  'A tradicional Festa das Nações já faz parte do calendário de muitas famílias da Zona Oeste. Mais do que uma festa, é um evento que une a igreja em um só propósito: arrecadar fundos para a expansão da obra e a propagação do evangelho.',
  '2026-07-17T18:00:00-03:00',
  12.50,
  null,
  'Rua Alfredo de Morais, 589, Campo Grande, RJ',
  '(21) 98158-3331',
  'contato.festadasnacoes@gmail.com',
  null,
  null,
  null,
  null
);

insert into artistas (nome, estilo, pais, descricao, ordem, ativo) values
  ('Banda Cultura do Céu', 'Louvor & Adoração', '🇧🇷 Brasil',
   'Uma das bandas mais aguardadas da noite, trazendo um repertório que mistura adoração e energia pra toda a família.',
   1, true),
  ('Salomão do Reggae', 'Reggae Gospel', '🇯🇲 Reggae',
   'O peso e a levada do reggae com mensagem — pra dançar, cantar e adorar do começo ao fim.',
   2, true),
  ('Juliane Nogueira', 'Voz & Ministração', '🇧🇷 Brasil',
   'Uma voz marcante que promete um dos momentos mais emocionantes da festa.',
   3, true),
  ('Kleber e Meire', 'Dupla · Louvor', '🇧🇷 Brasil',
   'Harmonia e ministração pra fechar a programação musical com chave de ouro.',
   4, true);

insert into programacao (dia, horario, descricao, ordem) values
  ('Sexta · 17 jul', '18h', 'Abertura dos portões e stands', 1),
  ('Sexta · 17 jul', '19h', 'Atração musical', 2),
  ('Sexta · 17 jul', '21h', 'Sorteios do passaporte', 3),
  ('Sexta · 17 jul', '22h', 'Show principal', 4),
  ('Sexta · 17 jul', '00h', 'Encerramento', 5),
  ('Sábado · 18 jul', '18h', 'Abertura dos portões e stands', 1),
  ('Sábado · 18 jul', '19h', 'Atração musical', 2),
  ('Sábado · 18 jul', '21h', 'Sorteios do passaporte', 3),
  ('Sábado · 18 jul', '22h', 'Show de encerramento', 4),
  ('Sábado · 18 jul', '00h', 'Encerramento', 5);

insert into comidas (pais, prato, emoji, ordem) values
  ('Alemanha', 'Pernil', '🥨', 1),
  ('Argentina', 'Churrasco', '🥩', 2),
  ('EUA', 'Burger', '🍔', 3),
  ('Itália', 'Massas', '🍝', 4),
  ('Austrália', 'BBQ', '🍖', 5),
  ('+11 países', 'e mais', '🌎', 6);

insert into faq (pergunta, resposta, ordem) values
  ('Quando e onde será?',
   '17 e 18 de julho, das 18h à 00h, no Espaço de Eventos Verbo Campo Grande — Rua Alfredo de Morais, 589, Campo Grande, RJ.',
   1),
  ('Como funciona o ingresso?',
   'É seu passe livre para os shows e stands. Válido para 1 dia de festa. Crianças até 3 anos não pagam. Não é necessário para o bazar.',
   2),
  ('Como é o pagamento na festa?',
   'Na Casa de Câmbio você compra tickets de consumação — é o "dinheiro" da festa para comida, bebida e brinquedos. Sobrou? Troque de volta até 00h.',
   3),
  ('O que é o passaporte?',
   'Sua porta de entrada para os sorteios. Prove as comidas, colecione 8 selos diferentes, preencha com nome + telefone e devolva na Casa de Câmbio.',
   4),
  ('Posso ser patrocinador?',
   'Sim! Escreva para contato.festadasnacoes@gmail.com e solicite nosso Mídia Kit.',
   5);
