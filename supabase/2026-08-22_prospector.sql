-- ============================================================================
-- Prospector: prospecção vendida como produto próprio
-- Rode no SQL Editor do projeto "Criador de paginas".
-- ============================================================================
--
-- A prospecção deixa de vender só site: quem vende seguro, plano de saúde ou
-- qualquer outra coisa usa a MESMA máquina (busca no Maps, mensagens com IA,
-- escuta, follow-up) para oferecer o produto DELE.
--
-- oferta_tipo diz o que as mensagens vendem:
--   'site'    (padrão) — comportamento de sempre: oferece a demonstração de
--             site, e o Fechador pode criar a página sozinho. NADA muda para
--             quem já usa.
--   'propria' — as mensagens vendem o que estiver em oferta_resumo; o
--             Fechador (que só sabe criar site) fica de fora e a resposta
--             quente vira aviso para o humano assumir.
--
-- oferta_resumo é a descrição curta do que se vende ("consórcio de imóveis",
-- "plano de saúde empresarial") — entra na mensagem, no prompt da IA e na
-- classificação de respostas.

alter table prospeccao_config
  add column if not exists oferta_tipo text not null default 'site'
    check (oferta_tipo in ('site', 'propria')),
  add column if not exists oferta_resumo text;
