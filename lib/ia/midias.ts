/*
 * Os arquivos da página: vídeo, áudio, PDF, imagem.
 *
 * Isto NÃO é o anexo do chat. Anexo vai dentro da mensagem para a IA LER
 * (foto do produto, PDF do cardápio). Arquivo aqui é para HOSPEDAR: o vídeo
 * de 8 segundos que roda no topo da landing, o áudio do depoimento, o PDF do
 * catálogo que o visitante baixa. A IA não lê o vídeo — ela escreve a tag que
 * aponta para ele.
 *
 * Por isso o caminho é outro: o navegador sobe direto para o Storage (as
 * políticas do bucket já limitam cada conta à própria pasta), e o servidor só
 * anota no catálogo. Vídeo passando por server action esbarraria no teto de
 * corpo da requisição muito antes do primeiro arquivo útil.
 *
 * Sem "server-only" de propósito: aqui é tudo função pura (que extensão
 * vale, como nomear no armazenamento, como formatar o tamanho), e quem mais
 * precisa dessas respostas é o NAVEGADOR, que é quem sobe o arquivo.
 */

export type TipoMidia = "video" | "audio" | "imagem" | "pdf" | "outro";

export type Midia = {
  id: string;
  nome: string;
  caminho: string;
  url: string;
  tipo: TipoMidia;
  bytes: number;
  created_at: string;
};

/*
 * O que entra. Formatos que o navegador toca sem plugin, mais PDF.
 *
 * Fora da lista de propósito: executável, documento do Office e qualquer
 * coisa que o navegador baixaria em vez de mostrar. A página é feita para ser
 * vista, e bucket público não é lugar de arquivo arbitrário.
 */
export const EXTENSOES_MIDIA: Record<string, { tipo: TipoMidia; mime: string }> = {
  mp4: { tipo: "video", mime: "video/mp4" },
  webm: { tipo: "video", mime: "video/webm" },
  mov: { tipo: "video", mime: "video/quicktime" },
  m4v: { tipo: "video", mime: "video/mp4" },
  ogv: { tipo: "video", mime: "video/ogg" },
  mp3: { tipo: "audio", mime: "audio/mpeg" },
  m4a: { tipo: "audio", mime: "audio/mp4" },
  wav: { tipo: "audio", mime: "audio/wav" },
  ogg: { tipo: "audio", mime: "audio/ogg" },
  jpg: { tipo: "imagem", mime: "image/jpeg" },
  jpeg: { tipo: "imagem", mime: "image/jpeg" },
  png: { tipo: "imagem", mime: "image/png" },
  webp: { tipo: "imagem", mime: "image/webp" },
  gif: { tipo: "imagem", mime: "image/gif" },
  svg: { tipo: "imagem", mime: "image/svg+xml" },
  avif: { tipo: "imagem", mime: "image/avif" },
  pdf: { tipo: "pdf", mime: "application/pdf" },
};

/* Teto por arquivo. Vídeo de landing é curto; 200MB é folga de sobra, e
   acima disso a página fica lenta de qualquer jeito. */
export const MAX_BYTES_MIDIA = 200 * 1024 * 1024;

export function classificarArquivo(nome: string): { tipo: TipoMidia; mime: string } | null {
  const ext = nome.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSOES_MIDIA[ext] ?? null;
}

/*
 * Nome seguro para o Storage: sem acento, sem espaço, sem barra — e com
 * carimbo de tempo, porque subir "video.mp4" duas vezes não pode fazer o
 * segundo apagar o primeiro no cache do CDN.
 */
export function nomeNoStorage(nomeOriginal: string): string {
  const limpo = nomeOriginal
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(-80);
  return `${Date.now().toString(36)}-${limpo || "arquivo"}`;
}

export const emMb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;

/*
 * A lista de arquivos que vai no pedido à IA.
 *
 * Sem isto a IA inventaria um caminho qualquer ("/videos/topo.mp4") e a
 * página sairia com vídeo quebrado. Com os endereços na mão, ela escreve a
 * tag certa apontando para o arquivo que existe de verdade.
 */
export function blocoParaIA(midias: Midia[]): string {
  if (midias.length === 0) return "";
  const linhas = midias.map((m) => `- ${m.tipo} "${m.nome}" (${emMb(m.bytes)}): ${m.url}`);
  return [
    "",
    "ARQUIVOS JÁ HOSPEDADOS PARA ESTA PÁGINA (use estes endereços exatos):",
    ...linhas,
    "",
    'Vídeo: use <video src="ENDEREÇO" controls playsinline preload="metadata"> — e, se for vídeo de fundo, acrescente muted loop autoplay.',
    "Áudio: use <audio src=\"ENDEREÇO\" controls>. PDF: um link que abre em nova aba.",
    "Nunca invente caminho de arquivo: se não estiver nesta lista, o arquivo não existe.",
  ].join("\n");
}
