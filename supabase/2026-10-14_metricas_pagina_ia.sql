-- As páginas de IA voltam a registrar métrica.
--
-- O QUE ACONTECEU
--
-- A política que protege analytics_eventos exige que o par (site, org) exista
-- de verdade — foi assim que fechamos a porta para alguém inventar visita em
-- conta alheia. Ela confere isso com um "exists" em sites_ia e em sites.
--
-- Só que uma política roda com os poderes de QUEM está inserindo, e quem
-- insere a visita é o visitante anônimo. A tabela `sites` tem leitura pública
-- para site publicado, então o "exists" dela enxerga a linha e a métrica dos
-- sites de blocos passa. A tabela `sites_ia` NÃO tem — e nem deve ter, porque
-- isso entregaria a lista de páginas de todos os clientes a qualquer um. O
-- "exists" dela volta vazio, a política nega, e o insert morre em silêncio
-- (medição nunca derruba página).
--
-- Resultado: toda página de IA media ZERO desde que esta política entrou.
-- Visita, clique e tempo de rolagem, tudo recusado. A tela de métricas estava
-- certa ao mostrar zero — não chegava nada mesmo.
--
-- O CONSERTO
--
-- A conferência sai de dentro da política e vira uma função com poderes
-- próprios (security definer). Ela responde só sim ou não para um par que o
-- visitante JÁ TEM EM MÃOS (os dois identificadores vão no fonte da página,
-- como a chave anônima), e não devolve nenhuma linha, nenhum nome, nenhuma
-- lista. A porta continua fechada do mesmo jeito; o que muda é que agora ela
-- enxerga os dois lados.
--
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.

create or replace function public.pagina_de_metrica(p_site uuid, p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from sites_ia s where s.id = p_site and s.org_id = p_org)
      or exists (select 1 from sites b where b.id = p_site and b.org_id = p_org);
$$;

-- Só o que precisa executar executa.
revoke all on function public.pagina_de_metrica(uuid, uuid) from public;
grant execute on function public.pagina_de_metrica(uuid, uuid) to anon, authenticated;

drop policy if exists "analytics_insert_publico" on analytics_eventos;
create policy "analytics_insert_publico" on analytics_eventos
  for insert to anon, authenticated
  with check (
    tipo in ('pageview', 'click', 'saida')
    and coalesce(length(rotulo), 0) <= 120
    and coalesce(length(path), 0) <= 300
    and coalesce(length(referrer), 0) <= 600
    and coalesce(length(origem), 0) <= 80
    and (
      -- As nossas páginas de venda (ver lib/vendas-metricas.ts): não têm linha
      -- em tabela nenhuma, então entram por um par reservado e nomeado.
      (
        analytics_eventos.org_id = '00000000-0000-4000-8000-000000000001'::uuid
        and analytics_eventos.site_id in (
          '00000000-0000-4000-8000-000000000010'::uuid,
          '00000000-0000-4000-8000-000000000011'::uuid
        )
      )
      or public.pagina_de_metrica(analytics_eventos.site_id, analytics_eventos.org_id)
    )
  );

-- Ler continua sendo só de quem é dono: nada aqui mexe nisso.
drop policy if exists "analytics_select_membro" on analytics_eventos;
create policy "analytics_select_membro" on analytics_eventos
  for select to authenticated using (is_member(org_id));
