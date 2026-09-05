-- Várias linhas de WhatsApp por conta.
--
-- Até aqui cada organização tinha UM WhatsApp conectado, guardado em
-- prospeccao_config (whatsapp_status, whatsapp_qr…). Agora cada número é uma
-- LINHA: conecta separado, tem o próprio QR, o próprio limite diário, e o
-- servidor decide qual linha manda cada mensagem — revezando entre as que
-- estão em uso e chamando a próxima quando uma cai.
--
-- A linha "principal" é a de sempre: o perfil antigo do agente
-- (.perfil-whatsapp). Ela nasce aqui para todo mundo que já tem config, e
-- as colunas antigas continuam espelhadas nela — agente e painel antigos
-- seguem funcionando.

create table if not exists whatsapp_linhas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) on delete cascade,
  nome text not null default 'Linha',
  -- ordem de preferência: com "1 linha enviando", a de menor ordem manda;
  -- caiu, a próxima assume.
  ordem smallint not null default 1,
  -- qual agente segura o perfil do navegador desta linha (null = ninguém ainda)
  agente_id uuid references agentes(id) on delete set null,
  -- a linha do perfil antigo do agente; uma por organização
  principal boolean not null default false,
  status text not null default 'desconectado'
    check (status in ('desconectado', 'aguardando_qr', 'conectado', 'erro')),
  qr text,
  mensagem text,
  atualizado_em timestamptz,
  desconectar_pedido boolean not null default false,
  -- quando esta linha mandou a última mensagem: é o que faz o revezamento
  ultima_enviada_em timestamptz,
  -- desligada pelo dono: conectada, mas fora do envio
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_linhas_org_idx on whatsapp_linhas (org_id, ordem);
create unique index if not exists whatsapp_linhas_principal_uk
  on whatsapp_linhas (org_id) where principal;

alter table whatsapp_linhas enable row level security;
drop policy if exists "minhas linhas" on whatsapp_linhas;
create policy "minhas linhas" on whatsapp_linhas for select using (is_member(org_id));
drop policy if exists "criar linhas" on whatsapp_linhas;
create policy "criar linhas" on whatsapp_linhas for insert with check (is_member(org_id));
drop policy if exists "mudar linhas" on whatsapp_linhas;
create policy "mudar linhas" on whatsapp_linhas for update using (is_member(org_id));
drop policy if exists "apagar linhas" on whatsapp_linhas;
create policy "apagar linhas" on whatsapp_linhas for delete using (is_member(org_id));

-- Cada mensagem enviada lembra por qual linha saiu: é o que conta o limite
-- diário POR NÚMERO e diz em qual WhatsApp ouvir a resposta.
alter table prospeccao_mensagens
  add column if not exists linha_id uuid references whatsapp_linhas(id) on delete set null;
create index if not exists prospeccao_mensagens_linha_idx
  on prospeccao_mensagens (org_id, linha_id, enviada_em);

alter table prospeccao_config
  -- quantas linhas enviam ao mesmo tempo (1 = uma de cada vez, com as outras
  -- de reserva; 2+ = revezando entre elas)
  add column if not exists linhas_simultaneas smallint not null default 1,
  -- a cadência global: a próxima mensagem da conta só sai depois daqui,
  -- seja por qual linha for
  add column if not exists proximo_envio_em timestamptz;

-- A linha principal de quem já tem config, com o estado atual copiado.
insert into whatsapp_linhas (org_id, nome, ordem, principal, status, mensagem, atualizado_em)
select org_id, 'Linha 1', 1, true,
       coalesce(whatsapp_status, 'desconectado'), whatsapp_mensagem, whatsapp_em
  from prospeccao_config
on conflict do nothing;
