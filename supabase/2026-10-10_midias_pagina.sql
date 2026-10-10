-- Arquivos da página: vídeo, áudio, PDF, imagem.
--
-- O construtor só aceitava anexar imagem e PDF — e aqueles anexos vão DENTRO
-- da mensagem, para a IA ler. Vídeo não é isso: é arquivo para HOSPEDAR e
-- aparecer na página. Quem faz uma landing com três vídeos curtos não tinha
-- por onde subir, nem no criador de páginas nem no Prospector.
--
-- Esta tabela é o catálogo. O arquivo em si mora no bucket `midias`, na pasta
-- da própria organização ({org}/ia/{site}/arquivos/...), com as políticas de
-- Storage que já existem — por isso o navegador sobe direto, sem passar o
-- vídeo inteiro pelo servidor.
--
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.

create table if not exists sites_ia_midias (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) on delete cascade,
  site_ia_id uuid not null references sites_ia(id) on delete cascade,

  -- O nome que o cliente reconhece (o do arquivo dele).
  nome text not null,
  -- Caminho dentro do bucket `midias`, para poder apagar depois.
  caminho text not null,
  -- Endereço público, que é o que entra no HTML da página.
  url text not null,
  -- 'video' | 'audio' | 'imagem' | 'pdf' | 'outro' — governa como a IA usa.
  tipo text not null default 'outro'
    check (tipo in ('video', 'audio', 'imagem', 'pdf', 'outro')),
  bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists sites_ia_midias_site_idx
  on sites_ia_midias (site_ia_id, created_at desc);

alter table sites_ia_midias enable row level security;
drop policy if exists "sites_ia_midias_membro" on sites_ia_midias;
create policy "sites_ia_midias_membro" on sites_ia_midias
  for all to authenticated using (is_member(org_id)) with check (is_member(org_id));
