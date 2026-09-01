-- Guardar o que o WhatsApp já nos respondeu sobre cada número.
--
-- Hoje o agente DESCOBRE, na hora de mandar a primeira mensagem, se o número
-- existe no WhatsApp — e joga essa informação fora: ela ficava só na linha da
-- mensagem. O mesmo lead voltava na exportação como "tem WhatsApp", e o
-- vendedor tentava de novo.
--
--   null   ainda não sabemos (só o palpite pelo formato do número)
--   true   o WhatsApp abriu a conversa: o número existe, confirmado
--   false  o WhatsApp disse que o número não está lá

alter table public.prospeccao
  add column if not exists whatsapp_ok boolean;

comment on column public.prospeccao.whatsapp_ok is
  'Confirmação vinda do próprio WhatsApp na primeira tentativa de envio. Nulo = nunca tentamos.';

-- A exportação e a lista filtram por este campo junto com o org_id.
create index if not exists prospeccao_org_whatsapp_ok_idx
  on public.prospeccao (org_id, whatsapp_ok);
