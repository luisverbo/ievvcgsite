-- ============================================================================
-- Etapa 1 do Fechador: o agente escuta as respostas do WhatsApp
-- Rode no SQL Editor do projeto "Criador de paginas".
-- ============================================================================
--
-- O agente passa a detectar quando um lead abordado responde. A resposta é
-- guardada na própria mensagem que a originou, classificada pela IA
-- (interesse / preço / dúvida / recusa / outro), e o prospecto muda de status
-- sozinho. Recusa vira opt-out: nunca mais recebe nada — nem follow-up.

alter table prospeccao_mensagens
  add column if not exists resposta_texto text,
  add column if not exists resposta_em timestamptz,
  add column if not exists resposta_classe text
    check (resposta_classe in ('interesse', 'preco', 'duvida', 'recusa', 'outro'));

-- O opt-out mora no PROSPECTO, não na mensagem: vale para sempre, para
-- qualquer campanha futura. É a trava que protege o número do cliente (e o
-- cliente da LGPD): quem pediu para sair, saiu.
alter table prospeccao
  add column if not exists nao_perturbar boolean not null default false;

-- O agente pergunta "de quem estou esperando resposta?" a cada volta — a
-- consulta é por org + status enviada + sem resposta ainda.
create index if not exists prospeccao_mensagens_aguardando_idx
  on prospeccao_mensagens (org_id, enviada_em)
  where status = 'enviada' and resposta_em is null;
