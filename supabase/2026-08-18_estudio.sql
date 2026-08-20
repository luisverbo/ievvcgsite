-- ============================================================================
-- Estúdio de Vídeos (ferramenta interna do admin) — Etapas 1 e 2
-- Rode no SQL Editor do projeto "Criador de paginas".
-- ============================================================================
--
-- Módulo pessoal: garimpo de vídeos virais no YouTube (score de outlier),
-- dissecação da fórmula com LLM e, na Etapa 2, geração do vídeo pelo
-- MoneyPrinterTurbo rodando na máquina do dono.
--
-- RLS ligada SEM política nenhuma, de propósito: estas tabelas só são lidas
-- e escritas pelo servidor (service role), atrás de ehAdmin(). Nenhum
-- cliente logado enxerga uma linha — nem as dele, porque não há "dele" aqui.

-- Vídeos garimpados (ou colados na mão, no caso do TikTok).
create table if not exists estudio_achados (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) on delete cascade,
  fonte text not null default 'youtube' check (fonte in ('youtube', 'tiktok')),
  video_id text not null,
  url text,
  titulo text,
  canal text,
  canal_id text,
  views bigint,
  likes bigint,
  comentarios bigint,
  publicado_em timestamptz,
  duracao_s int,
  -- A métrica-chave: views do vídeo ÷ média de views do canal.
  -- Vídeo 20x acima da média num canal pequeno vale mais que canal gigante.
  canal_media_views numeric,
  score_outlier numeric,
  views_por_dia numeric,
  thumbnail text,
  transcricao text,
  tema text not null,
  created_at timestamptz not null default now(),
  unique (org_id, fonte, video_id)
);
create index if not exists estudio_achados_tema_idx on estudio_achados (org_id, tema, created_at desc);

-- A fórmula dissecada: gancho, estrutura, promessa, padrão de título, CTA.
create table if not exists estudio_formulas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) on delete cascade,
  nome text not null,
  tema text,
  formula jsonb not null,
  -- De quais achados ela nasceu (auditoria; sem FK para poder limpar achados).
  achados uuid[] not null default '{}',
  modelo text,
  created_at timestamptz not null default now()
);

-- Projeto de vídeo. A FILA é esta tabela: o status faz o papel do job.
create table if not exists estudio_projetos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) on delete cascade,
  titulo text not null,
  tema text,
  formula_id uuid references estudio_formulas(id) on delete set null,
  roteiro text,
  -- Termos de busca de clipes (em inglês — Pexels/Pixabay respondem melhor).
  termos text[] not null default '{}',
  status text not null default 'rascunho'
    check (status in ('rascunho', 'roteiro_pronto', 'na_fila', 'gerando', 'pronto', 'erro')),
  -- Texto livre do worker ("baixando clipes", "narrando", "renderizando 40%").
  progresso text,
  erro text,
  formato_16x9 boolean not null default false,
  duracao_alvo_s int not null default 60,
  -- Caminho local na máquina que renderizou + URL se subiu pro painel.
  arquivo text,
  arquivo_16x9 text,
  video_url text,
  agente text,
  iniciado_em timestamptz,
  concluido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists estudio_projetos_fila_idx on estudio_projetos (status, created_at);

alter table estudio_achados enable row level security;
alter table estudio_formulas enable row level security;
alter table estudio_projetos enable row level security;
