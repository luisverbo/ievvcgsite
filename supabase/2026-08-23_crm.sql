-- ============================================================================
-- CRM: lembretes, cadência de remarketing, importação e respostas rápidas
-- Rode no SQL Editor do projeto "Criador de paginas".
-- ============================================================================

-- 1) LEMBRETE no lead: "me lembra dia 28". O card sobe para o topo no dia.
alter table prospeccao
  add column if not exists lembrete_em date;

-- 2) CADÊNCIA do remarketing: até 3 toques em quem ficou em silêncio.
--
-- etapa diz qual toque é a mensagem (1ª, 2ª ou 3ª insistência). O índice
-- antigo travava em UM follow-up por prospecto para sempre; o novo trava em
-- um POR ETAPA — a proteção continua (nunca duas mensagens da mesma etapa),
-- e as etapas 2 e 3 só existem se o dono configurar os dias delas.
alter table prospeccao_mensagens
  add column if not exists etapa smallint not null default 1;

drop index if exists prospeccao_mensagens_followup_uk;
create unique index if not exists prospeccao_mensagens_followup_uk
  on prospeccao_mensagens (org_id, prospecto_id, etapa)
  where tipo = 'followup';

alter table prospeccao_config
  add column if not exists followup_dias_2 smallint not null default 0,
  add column if not exists followup_dias_3 smallint not null default 0;

-- 3) RESPOSTAS RÁPIDAS: os textos que o vendedor cola quando o lead responde.
--    Array de {t: título, x: texto}, no máximo alguns — é atalho, não CMS.
alter table prospeccao_config
  add column if not exists respostas_rapidas jsonb;

-- (4 — importação de planilha não precisa de coluna: as linhas entram na
--  prospeccao com fonte = 'import', usando o mesmo caminho da busca.)
