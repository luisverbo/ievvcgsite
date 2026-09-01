-- Métricas das NOSSAS páginas de venda (/ e /prospector).
--
-- As landings não são sites de cliente: não têm linha em sites_ia nem em
-- sites. A política de insert exige que o par (site, org) exista numa dessas
-- duas tabelas — foi assim que fechamos a porta para alguém inventar visita
-- em conta alheia — e por isso a landing não conseguia gravar nada.
--
-- Em vez de criar um site de mentira (que apareceria na lista do dono e
-- contaria como site publicado), abrimos uma exceção nomeada para um par de
-- identificadores reservados. Eles não são segredo: vão no fonte da landing,
-- como a chave anônima. Quem tiver esse par pode INSERIR evento — o mesmo
-- que um visitante real faz — e nada além disso: LER continua exigindo o
-- service role, ou seja, só o Admin enxerga.

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
      -- As nossas páginas de venda (ver lib/vendas-metricas.ts).
      (
        analytics_eventos.org_id = '00000000-0000-4000-8000-000000000001'::uuid
        and analytics_eventos.site_id in (
          '00000000-0000-4000-8000-000000000010'::uuid,
          '00000000-0000-4000-8000-000000000011'::uuid
        )
      )
      or exists (
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
