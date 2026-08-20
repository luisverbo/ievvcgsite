-- ============================================================================
-- Estúdio de Vídeos: controle da música de fundo
-- Rode no SQL Editor do projeto "Criador de paginas".
-- ============================================================================
--
-- A música do MoneyPrinterTurbo é sorteada de uma pastinha de MP3 que vem
-- com ele — e a seleção padrão é pequena e melancólica. Agora a escolha é
-- por projeto: sem música, sorteio, ou um arquivo seu.
--
--   musica = 'nenhuma'   → silêncio (só a narração)
--   musica = 'aleatoria' → sorteia da pasta do MPT (comportamento antigo)
--   musica = <caminho>   → um arquivo específico da sua máquina

alter table estudio_projetos
  add column if not exists musica text not null default 'aleatoria',
  -- Volume em PORCENTAGEM (20 = 20%). O MPT recebe 0.2.
  add column if not exists musica_volume smallint not null default 15;
