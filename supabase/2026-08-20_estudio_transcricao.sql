-- ============================================================================
-- Estúdio: transcrição buscada pelo agente (IP residencial)
-- Rode no SQL Editor do projeto "Criador de paginas".
-- ============================================================================
--
-- Buscar a legenda pelo servidor da Vercel falha na maioria dos vídeos: é IP
-- de datacenter, e o YouTube responde com tela de consentimento em vez do
-- conteúdo. O agente do dono roda em IP residencial — o mesmo motivo pelo
-- qual a busca no Maps mora nele.
--
-- Esta coluna evita insistir para sempre no vídeo que realmente não tem
-- legenda: tentou, marcou a hora, só tenta de novo bem depois.

alter table estudio_achados
  add column if not exists transcricao_tentada_em timestamptz;
