-- ============================================================================
-- Etapa 6: Follow-up automático — a segunda mensagem de quem não respondeu
-- Rode no SQL Editor do projeto "Criador de paginas".
-- ============================================================================
--
-- Quem não respondeu em X dias recebe UMA segunda mensagem, no mesmo ritmo
-- humano e pela mesma fila. Uma só, para sempre: insistir duas vezes é o que
-- transforma prospecção em perseguição — e queima o número.
--
-- Quem pediu para não receber (nao_perturbar) nunca entra, e quem respondeu
-- qualquer coisa também não: follow-up é para o silêncio, não para a conversa.

alter table prospeccao_config
  add column if not exists followup_ligado boolean not null default false,
  add column if not exists followup_dias smallint not null default 4,
  add column if not exists followup_msg_modelo text,
  -- Relógio do preparo: no máximo uma varredura por hora, por conta.
  add column if not exists followup_rodou_em timestamptz;

-- O tipo da fila ganha mais um valor.
alter table prospeccao_mensagens
  drop constraint if exists prospeccao_mensagens_tipo_check;
alter table prospeccao_mensagens
  add constraint prospeccao_mensagens_tipo_check
    check (tipo in ('abordagem', 'fechamento', 'followup'));

-- Um follow-up por prospecto, para sempre.
create unique index if not exists prospeccao_mensagens_followup_uk
  on prospeccao_mensagens (org_id, prospecto_id)
  where tipo = 'followup';
