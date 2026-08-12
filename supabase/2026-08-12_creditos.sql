-- ============================================================================
-- Créditos de IA e chaves por cliente
-- Rode no SQL Editor do projeto "Criador de paginas".
-- ============================================================================
--
-- Duas formas de o cliente usar a IA:
--
--   1. CHAVE PRÓPRIA — ele cola a chave da Anthropic/OpenAI dele. A conta cai
--      direto no cartão dele, e o sistema não desconta nada.
--   2. CRÉDITO DA PLATAFORMA — usa a NOSSA chave e desconta do saldo dele.
--      Todo mês ele ganha uma cota, e pode comprar mais.
--
-- O saldo é guardado em MICRODÓLARES (1 dólar = 1.000.000). Centavo não serve:
-- uma chamada pequena custa fração de centavo, e arredondar cada uma para cima
-- ou para baixo distorceria o saldo em pouco tempo. Inteiro também evita todo
-- problema de ponto flutuante com dinheiro.

-- ----------------------------------------------------------------------------
-- Organizações: saldo, cota mensal e chaves próprias
-- ----------------------------------------------------------------------------
alter table organizacoes add column if not exists creditos bigint not null default 0;

-- Cota que entra automaticamente a cada mês (0 = plano sem cota).
alter table organizacoes add column if not exists cota_mensal bigint not null default 0;
alter table organizacoes add column if not exists cota_renovada_em date;

-- Chaves do cliente, cifradas no aplicativo (AES-256-GCM) antes de chegar
-- aqui. Um vazamento do banco não entrega chave de ninguém: o segredo que
-- decifra fica na env APP_CRYPTO_KEY, fora do banco.
alter table organizacoes add column if not exists anthropic_key_cifrada text;
alter table organizacoes add column if not exists openai_key_cifrada text;
-- Últimos 4 caracteres, só para a tela mostrar "sk-ant-…f3Ab" sem decifrar.
alter table organizacoes add column if not exists anthropic_key_final text;
alter table organizacoes add column if not exists openai_key_final text;

-- O plano decide o que aparece no painel. 'agencia' é o de R$300.
alter table organizacoes drop constraint if exists organizacoes_plano_check;
alter table organizacoes add constraint organizacoes_plano_check
  check (plano in ('free', 'pro', 'agencia'));

-- ----------------------------------------------------------------------------
-- Extrato — toda entrada e saída de crédito, uma linha por evento
-- ----------------------------------------------------------------------------
-- Isto é dinheiro: nada de só somar e subtrair uma coluna. Com o extrato dá
-- para reconstruir o saldo, conferir uma cobrança contestada e responder
-- "por que gastei US$4 ontem?" sem chutar.
create table if not exists creditos_lancamentos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) on delete cascade,
  -- positivo = entrou crédito, negativo = consumo
  valor bigint not null,
  tipo text not null check (tipo in ('cota', 'compra', 'uso', 'ajuste', 'estorno')),
  descricao text not null default '',
  -- de onde veio o consumo (página de IA, ebook…), para o extrato ser útil
  referencia_tipo text,
  referencia_id uuid,
  modelo text,
  tokens_entrada integer,
  tokens_saida integer,
  saldo_depois bigint not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists creditos_lancamentos_org_idx
  on creditos_lancamentos (org_id, created_at desc);

alter table creditos_lancamentos enable row level security;

-- O cliente lê o próprio extrato. Escrever, só o servidor (service_role, que
-- ignora RLS) — ninguém dá crédito para si mesmo pelo navegador.
drop policy if exists "extrato da minha org" on creditos_lancamentos;
create policy "extrato da minha org" on creditos_lancamentos
  for select using (is_member(org_id));

-- ----------------------------------------------------------------------------
-- Débito atômico
-- ----------------------------------------------------------------------------
-- Feito no banco, não no aplicativo: duas gerações ao mesmo tempo poderiam ler
-- o mesmo saldo e gravar o mesmo resultado, e uma delas sairia de graça. Aqui
-- o UPDATE trava a linha e o saldo negativo é impossível.
create or replace function public.debitar_creditos(
  p_org uuid,
  p_valor bigint,
  p_descricao text,
  p_referencia_tipo text default null,
  p_referencia_id uuid default null,
  p_modelo text default null,
  p_tokens_entrada integer default null,
  p_tokens_saida integer default null
)
returns bigint
language plpgsql security definer
set search_path = public
as $$
declare
  novo_saldo bigint;
begin
  if p_valor <= 0 then
    select creditos into novo_saldo from organizacoes where id = p_org;
    return novo_saldo;
  end if;

  update organizacoes
     set creditos = greatest(0, creditos - p_valor)
   where id = p_org
  returning creditos into novo_saldo;

  if novo_saldo is null then
    raise exception 'organização % não encontrada', p_org;
  end if;

  insert into creditos_lancamentos
    (org_id, valor, tipo, descricao, referencia_tipo, referencia_id,
     modelo, tokens_entrada, tokens_saida, saldo_depois)
  values
    (p_org, -p_valor, 'uso', p_descricao, p_referencia_tipo, p_referencia_id,
     p_modelo, p_tokens_entrada, p_tokens_saida, novo_saldo);

  return novo_saldo;
end;
$$;

-- Entrada de crédito: cota mensal, compra, ajuste ou estorno.
create or replace function public.creditar(
  p_org uuid,
  p_valor bigint,
  p_tipo text,
  p_descricao text
)
returns bigint
language plpgsql security definer
set search_path = public
as $$
declare
  novo_saldo bigint;
begin
  update organizacoes
     set creditos = creditos + p_valor
   where id = p_org
  returning creditos into novo_saldo;

  if novo_saldo is null then
    raise exception 'organização % não encontrada', p_org;
  end if;

  insert into creditos_lancamentos
    (org_id, valor, tipo, descricao, saldo_depois)
  values (p_org, p_valor, p_tipo, p_descricao, novo_saldo);

  return novo_saldo;
end;
$$;

-- Cota do mês, uma vez só por mês. O 'where' com a data é o que impede duas
-- abas abertas darem cota dobrada.
create or replace function public.renovar_cota(p_org uuid)
returns bigint
language plpgsql security definer
set search_path = public
as $$
declare
  linha organizacoes%rowtype;
begin
  select * into linha from organizacoes where id = p_org;
  if linha.id is null or linha.cota_mensal <= 0 then
    return coalesce(linha.creditos, 0);
  end if;

  if linha.cota_renovada_em is not null
     and linha.cota_renovada_em > (current_date - interval '30 days') then
    return linha.creditos;
  end if;

  update organizacoes
     set cota_renovada_em = current_date
   where id = p_org
     and (cota_renovada_em is null
          or cota_renovada_em <= (current_date - interval '30 days'));

  if not found then
    return linha.creditos;
  end if;

  return creditar(p_org, linha.cota_mensal, 'cota', 'Crédito mensal do plano');
end;
$$;
