-- ============================================================================
-- Assinaturas e pagamentos (Stripe + Mercado Pago)
-- Rode no SQL Editor do projeto "Criador de paginas".
-- ============================================================================
--
-- REGRA CENTRAL: a verdade sobre "está pago até quando" mora AQUI, não na
-- Stripe nem no Mercado Pago.
--
-- São dois provedores cobrando a mesma assinatura por caminhos diferentes
-- (cartão recorrente e Pix avulso). Se cada um mandasse no acesso do cliente,
-- a hora que os dois falassem ao mesmo tempo — o Pix cai e a retentativa do
-- cartão passa dois dias depois — o cliente pagaria o mesmo mês duas vezes e
-- ninguém saberia dizer qual valia.
--
-- Com um campo só (`pago_ate`), os dois viram apenas mensageiros: "entrou
-- dinheiro para o período X". Quem decide o que isso significa é o sistema.

-- ----------------------------------------------------------------------------
-- Assinatura da organização
-- ----------------------------------------------------------------------------
create table if not exists assinaturas (
  org_id uuid primary key references organizacoes(id) on delete cascade,
  plano text not null default 'agencia' check (plano in ('pro', 'agencia')),

  -- Até quando o acesso está pago. É este campo que libera ou bloqueia.
  pago_ate timestamptz,

  -- Período que a próxima cobrança cobre. Guardado para reconhecer pagamento
  -- repetido do MESMO mês vindo pelo outro provedor.
  periodo_atual date,

  status text not null default 'nova'
    check (status in ('nova', 'ativa', 'atrasada', 'suspensa', 'cancelada')),

  -- Assinatura recorrente no cartão (Stripe). Pix nunca cria assinatura:
  -- ele paga um mês avulso.
  stripe_customer_id text,
  stripe_subscription_id text,

  -- Quando o cartão falhou. A tolerância conta a partir daqui.
  falhou_em timestamptz,
  avisado_em timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists assinaturas_status_idx on assinaturas (status, pago_ate);

alter table assinaturas enable row level security;
drop policy if exists "minha assinatura" on assinaturas;
create policy "minha assinatura" on assinaturas for select using (is_member(org_id));

-- ----------------------------------------------------------------------------
-- Pagamentos — um registro por dinheiro que entrou
-- ----------------------------------------------------------------------------
create table if not exists pagamentos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) on delete cascade,

  provedor text not null check (provedor in ('stripe', 'mercadopago')),
  -- Id do evento no provedor. A UNIQUE abaixo é o que impede crédito dobrado:
  -- os dois reenviam o mesmo webhook várias vezes, de propósito.
  evento_id text not null,

  tipo text not null check (tipo in ('assinatura', 'credito')),
  valor_centavos integer not null,
  moeda text not null default 'BRL',

  -- Para assinatura: qual mês foi pago. Para crédito: quanto foi creditado.
  periodo date,
  creditos bigint,

  status text not null default 'pago' check (status in ('pendente', 'pago', 'falhou', 'estornado')),
  descricao text not null default '',
  created_at timestamptz not null default now()
);
create unique index if not exists pagamentos_evento_uk on pagamentos (provedor, evento_id);
create index if not exists pagamentos_org_idx on pagamentos (org_id, created_at desc);

-- Um mês só pode ser pago uma vez, venha de onde vier. Esta é a trava que
-- impede o cliente de pagar o mesmo mês no Pix e no cartão.
create unique index if not exists pagamentos_periodo_uk
  on pagamentos (org_id, periodo)
  where tipo = 'assinatura' and status = 'pago';

alter table pagamentos enable row level security;
drop policy if exists "meus pagamentos" on pagamentos;
create policy "meus pagamentos" on pagamentos for select using (is_member(org_id));

-- ----------------------------------------------------------------------------
-- Cobrança em aberto para pagar no Pix
-- ----------------------------------------------------------------------------
-- Criada só quando o cartão falha. Não existe Pix na primeira assinatura: a
-- recorrência é a razão de ser do cartão.
create table if not exists cobrancas_pix (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) on delete cascade,
  periodo date not null,
  valor_centavos integer not null,
  mp_pagamento_id text,
  qr_code text,
  qr_code_base64 text,
  expira_em timestamptz,
  status text not null default 'pendente'
    check (status in ('pendente', 'pago', 'expirado', 'cancelado')),
  created_at timestamptz not null default now()
);
create index if not exists cobrancas_pix_org_idx on cobrancas_pix (org_id, status);

alter table cobrancas_pix enable row level security;
drop policy if exists "minhas cobrancas" on cobrancas_pix;
create policy "minhas cobrancas" on cobrancas_pix for select using (is_member(org_id));

-- ----------------------------------------------------------------------------
-- Registrar pagamento de assinatura (idempotente)
-- ----------------------------------------------------------------------------
-- Devolve true se o pagamento foi novo, false se já tinha sido processado.
-- Chamada pelos dois webhooks, que reenviam o mesmo evento de propósito.
create or replace function public.pagar_assinatura(
  p_org uuid,
  p_provedor text,
  p_evento text,
  p_valor integer,
  p_periodo date,
  p_ate timestamptz,
  p_descricao text
)
returns boolean
language plpgsql security definer
set search_path = public
as $$
begin
  begin
    insert into pagamentos (org_id, provedor, evento_id, tipo, valor_centavos,
                            periodo, status, descricao)
    values (p_org, p_provedor, p_evento, 'assinatura', p_valor,
            p_periodo, 'pago', p_descricao);
  exception when unique_violation then
    -- Webhook repetido, ou o mês já pago pelo outro provedor. Nos dois casos
    -- o certo é não fazer nada de novo.
    return false;
  end;

  update assinaturas
     set pago_ate = greatest(coalesce(pago_ate, now()), p_ate),
         periodo_atual = p_periodo,
         status = 'ativa',
         falhou_em = null,
         avisado_em = null,
         updated_at = now()
   where org_id = p_org;

  if not found then
    insert into assinaturas (org_id, pago_ate, periodo_atual, status)
    values (p_org, p_ate, p_periodo, 'ativa');
  end if;

  return true;
end;
$$;

-- ----------------------------------------------------------------------------
-- Registrar compra de crédito (idempotente)
-- ----------------------------------------------------------------------------
create or replace function public.pagar_credito(
  p_org uuid,
  p_provedor text,
  p_evento text,
  p_valor integer,
  p_creditos bigint,
  p_descricao text
)
returns boolean
language plpgsql security definer
set search_path = public
as $$
begin
  begin
    insert into pagamentos (org_id, provedor, evento_id, tipo, valor_centavos,
                            creditos, status, descricao)
    values (p_org, p_provedor, p_evento, 'credito', p_valor,
            p_creditos, 'pago', p_descricao);
  exception when unique_violation then
    return false;
  end;

  perform creditar(p_org, p_creditos, 'compra', p_descricao);
  return true;
end;
$$;
