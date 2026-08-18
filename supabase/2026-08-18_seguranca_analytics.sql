-- ============================================================================
-- Segurança: aperta a porta pública de métricas
-- Rode no SQL Editor do projeto "Criador de paginas".
-- ============================================================================
--
-- O script de métricas roda no navegador do visitante e grava direto no
-- Supabase com a anon key — que é pública por definição. A política antiga
-- aceitava QUALQUER linha: qualquer pessoa com a anon key (está no fonte de
-- todo site publicado) podia inventar visitas para qualquer conta, encher o
-- banco de lixo ou gravar um `tipo` inventado.
--
-- A política nova continua pública (métricas de visitante são assim), mas o
-- banco só aceita a linha se:
--   1. o tipo for um dos três reais;
--   2. o par (site, org) EXISTIR de verdade — em sites_ia ou em sites;
--   3. os campos de texto couberem em tamanhos de gente.
--
-- Poluição dirigida a um site específico continua possível (é o mesmo que o
-- visitante real faz), mas inventar conta alheia ou entulhar tabela, não.

drop policy if exists "analytics_insert_publico" on analytics_eventos;
create policy "analytics_insert_publico" on analytics_eventos
  for insert
  with check (
    tipo in ('pageview', 'click', 'saida')
    and coalesce(length(rotulo), 0) <= 120
    and coalesce(length(path), 0) <= 300
    and coalesce(length(referrer), 0) <= 600
    and coalesce(length(origem), 0) <= 80
    and (
      exists (
        select 1 from sites_ia s
        where s.id = analytics_eventos.site_id
          and s.org_id = analytics_eventos.org_id
      )
      or exists (
        select 1 from sites s2
        where s2.id = analytics_eventos.site_id
          and s2.org_id = analytics_eventos.org_id
      )
    )
  );
