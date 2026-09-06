-- Diagnóstico do envio pelo WhatsApp.
--
-- 1) Foto da tela na última falha, por linha: o agente tira quando a conversa
--    não abre e o painel mostra em "Linhas". Numa VPS sem monitor é a única
--    forma de ver o que o WhatsApp exibiu.
-- 2) Tentativas: "a conversa não abriu" costuma ser o WhatsApp Web ainda sem
--    ligação com o celular logo depois da recarga, não o número. A mensagem
--    volta à fila até 3 vezes antes de virar erro.
--
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.

alter table whatsapp_linhas
  add column if not exists ultima_foto text,
  add column if not exists ultima_foto_em timestamptz,
  add column if not exists ultima_foto_motivo text;

alter table prospeccao_mensagens
  add column if not exists tentativas int not null default 0;
