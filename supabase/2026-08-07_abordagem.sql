-- Abordagem por WhatsApp: fila de mensagens + configuração do agente.
-- Rode no SQL Editor do projeto "Criador de paginas".
--
-- Dois modos:
--   semi  -> o painel abre o WhatsApp Web com o texto pronto e VOCÊ envia
--   auto  -> o agente envia sozinho, com ritmo humano e limite diário
--
-- A primeira mensagem NÃO leva o link do site: ela pede permissão para
-- mandar. Só quem responde é que vira site gerado.

create table if not exists prospeccao_mensagens (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) on delete cascade,
  prospecto_id uuid not null references prospeccao(id) on delete cascade,

  telefone text not null,          -- só dígitos, com DDI
  texto text not null,             -- já personalizado, pronto para enviar
  modo text not null default 'auto' check (modo in ('semi', 'auto')),

  status text not null default 'pendente'
    check (status in ('pendente', 'enviada', 'erro', 'cancelada', 'sem_whatsapp')),
  erro text,
  agente text,
  enviada_em timestamptz,
  created_at timestamptz not null default now(),

  -- nunca abordar a mesma empresa duas vezes por engano
  unique (org_id, prospecto_id)
);

create index if not exists prospeccao_mensagens_fila_idx
  on prospeccao_mensagens (status, created_at);
create index if not exists prospeccao_mensagens_org_idx
  on prospeccao_mensagens (org_id, created_at desc);

alter table prospeccao_mensagens enable row level security;
drop policy if exists "prospeccao_mensagens_all_membro" on prospeccao_mensagens;
create policy "prospeccao_mensagens_all_membro" on prospeccao_mensagens
  for all to authenticated using (is_member(org_id)) with check (is_member(org_id));

-- Configuração e estado da conexão do WhatsApp (uma linha por organização).
create table if not exists prospeccao_config (
  org_id uuid primary key references organizacoes(id) on delete cascade,

  modelo_mensagem text,
  -- Limites que protegem o número: disparo rápido e em volume é o que o
  -- WhatsApp detecta.
  limite_diario integer not null default 20,
  intervalo_min_s integer not null default 45,
  intervalo_max_s integer not null default 150,

  -- Estado da sessão do WhatsApp Web no agente
  whatsapp_status text not null default 'desconectado'
    check (whatsapp_status in ('desconectado', 'aguardando_qr', 'conectado', 'erro')),
  whatsapp_qr text,                 -- imagem do QR em data URI, para o painel exibir
  whatsapp_mensagem text,           -- último aviso do agente
  whatsapp_em timestamptz,

  updated_at timestamptz not null default now()
);

alter table prospeccao_config enable row level security;
drop policy if exists "prospeccao_config_all_membro" on prospeccao_config;
create policy "prospeccao_config_all_membro" on prospeccao_config
  for all to authenticated using (is_member(org_id)) with check (is_member(org_id));

alter table prospeccao add column if not exists contactado_em timestamptz;
