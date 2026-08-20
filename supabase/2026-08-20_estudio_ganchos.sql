-- ============================================================================
-- Estúdio: aberturas alternativas do roteiro
-- Rode no SQL Editor do projeto "Criador de paginas".
-- ============================================================================
--
-- O gancho é o que decide se o vídeo é assistido, e uma opção só é pouco.
-- O editor devolve 3 aberturas diferentes para o mesmo roteiro; ficam aqui
-- e viram botão na tela de aprovação, para trocar a primeira frase com um
-- clique em vez de gerar o roteiro inteiro de novo.

alter table estudio_projetos
  add column if not exists ganchos jsonb;
