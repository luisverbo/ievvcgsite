-- Teste de envio: "meu WhatsApp está conectado, mas será que manda?"
--
-- Uma mensagem de teste percorre exatamente o mesmo caminho de uma abordagem
-- (fila → agente → WhatsApp Web → resultado), e por isso responde a pergunta
-- de verdade: se ela sai, o envio funciona; se falha, o painel mostra o
-- motivo que veio da ponta ("a sessão caiu", "este número não tem WhatsApp").
--
-- Ela não tem empresa: é um número digitado à mão. Daí o prospecto_id passar
-- a aceitar nulo — antes toda mensagem precisava pertencer a um lead.

alter table prospeccao_mensagens
  drop constraint if exists prospeccao_mensagens_tipo_check;
alter table prospeccao_mensagens
  add constraint prospeccao_mensagens_tipo_check
    check (tipo in ('abordagem', 'fechamento', 'followup', 'gancho', 'apresentacao', 'reenvio', 'teste'));

alter table prospeccao_mensagens
  alter column prospecto_id drop not null;
