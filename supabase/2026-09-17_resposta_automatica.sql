-- Resposta automática do WhatsApp Business.
--
-- Metade das empresas abordadas responde com robô ("seja bem-vindo, você
-- está falando com o atendimento da X"). Isso não é resposta de gente: o
-- agente não pode mandar a apresentação, o lead não pode ir para
-- "Responderam" no funil e a IA não pode gastar crédito classificando menu
-- de atendimento.
--
-- A classe nova guarda esse caso. A mensagem fica com `resposta_texto`
-- preenchido e `resposta_em` NULO de propósito: assim o agente continua
-- escutando aquele número, e quando uma PESSOA escrever de verdade, aí sim
-- conta como resposta. O remarketing também continua, porque ninguém
-- respondeu ainda.
--
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.

alter table prospeccao_mensagens
  drop constraint if exists prospeccao_mensagens_resposta_classe_check;
alter table prospeccao_mensagens
  add constraint prospeccao_mensagens_resposta_classe_check
    check (resposta_classe in ('interesse', 'preco', 'duvida', 'recusa', 'outro', 'automatica'));
