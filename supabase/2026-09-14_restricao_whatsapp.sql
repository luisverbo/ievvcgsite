-- Restrição do WhatsApp por linha.
--
-- O WhatsApp pode restringir um número nos "dispositivos conectados": o
-- WhatsApp Web deixa de abrir conversas novas e mostra, no lugar da caixa de
-- texto, "Sua conta está restringida dos dispositivos conectados. Não é
-- possível iniciar novas conversas no momento". Conversas já existentes
-- continuam funcionando.
--
-- O agente reconhece essa tela e avisa o servidor; o servidor marca a linha
-- como restringida por 24h (nenhuma mensagem sai por ela), avisa o dono no
-- WhatsApp dele e o painel explica o que fazer.
--
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.

alter table whatsapp_linhas
  add column if not exists restringida_ate timestamptz,
  add column if not exists restringida_msg text;
