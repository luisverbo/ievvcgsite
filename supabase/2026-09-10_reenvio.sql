-- Reenvio: falar de novo com quem você já abordou.
--
-- Até aqui, abordado era abordado para sempre: um índice único por prospecto
-- em tipo='abordagem' (e outro em 'gancho') impedia uma segunda mensagem, e o
-- lead sumia da lista "Quem abordar". Quem não respondeu ficava inalcançável
-- fora da cadência automática de remarketing.
--
-- O tipo 'reenvio' não tem índice único: é o toque manual, com o texto que o
-- dono escolher e, se quiser, por um número específico. As travas que
-- importam continuam de pé — opt-out (nao_perturbar) e limite diário.

alter table prospeccao_mensagens
  drop constraint if exists prospeccao_mensagens_tipo_check;
alter table prospeccao_mensagens
  add constraint prospeccao_mensagens_tipo_check
    check (tipo in ('abordagem', 'fechamento', 'followup', 'gancho', 'apresentacao', 'reenvio'));
