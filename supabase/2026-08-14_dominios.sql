-- ============================================================================
-- Domínio próprio nas páginas de IA
-- Rode no SQL Editor do projeto "Criador de paginas".
-- ============================================================================
--
-- O cliente aponta o domínio DELE (clinicasorriso.com.br) para uma página de
-- IA. O painel registra o domínio na Vercel pela API; aqui fica o vínculo
-- domínio → página, que é o que o servidor consulta a cada visita.

create table if not exists dominios (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) on delete cascade,
  site_ia_id uuid not null references sites_ia(id) on delete cascade,

  -- Sempre minúsculo e sem porta; único no sistema inteiro: um domínio não
  -- pode apontar para duas páginas, nem de organizações diferentes.
  dominio text not null unique
    check (dominio = lower(dominio) and dominio ~ '^[a-z0-9.-]{4,253}$'),

  -- 'aguardando_dns' até a Vercel confirmar que o DNS aponta para cá.
  status text not null default 'aguardando_dns'
    check (status in ('aguardando_dns', 'ativo', 'erro')),
  detalhe text,
  verificado_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists dominios_org_idx on dominios (org_id);
create index if not exists dominios_site_idx on dominios (site_ia_id);

alter table dominios enable row level security;

-- O cliente enxerga e remove os próprios domínios; criar é sempre pelo
-- servidor (service_role), que é quem fala com a Vercel.
drop policy if exists "meus dominios" on dominios;
create policy "meus dominios" on dominios for select using (is_member(org_id));

drop policy if exists "apagar meus dominios" on dominios;
create policy "apagar meus dominios" on dominios for delete using (is_member(org_id));
