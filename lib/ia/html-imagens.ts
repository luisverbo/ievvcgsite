// Helpers puros (rodam no navegador E no servidor) para achar e trocar as
// imagens que a IA marcou no HTML com data-ia-prompt.

export type ImagemMarcada = {
  indice: number;
  prompt: string;
  src: string;
  alt: string;
  gerada: boolean; // src já aponta para uma imagem real (não é placeholder)
  orientacao: "paisagem" | "retrato" | "quadrado";
};

const RE_IMG = /<img\b[^>]*\bdata-ia-prompt\s*=\s*"([^"]*)"[^>]*>/gi;

function atributo(tag: string, nome: string): string {
  const m = new RegExp(`\\b${nome}\\s*=\\s*"([^"]*)"`, "i").exec(tag);
  return m?.[1] ?? "";
}

function orientacaoDaTag(tag: string): ImagemMarcada["orientacao"] {
  const w = Number(atributo(tag, "width"));
  const h = Number(atributo(tag, "height"));
  if (w > 0 && h > 0) {
    if (w / h > 1.15) return "paisagem";
    if (w / h < 0.87) return "retrato";
    return "quadrado";
  }
  return "paisagem";
}

export function listarImagensHtml(html: string): ImagemMarcada[] {
  const saida: ImagemMarcada[] = [];
  let m: RegExpExecArray | null;
  RE_IMG.lastIndex = 0;
  let i = 0;
  while ((m = RE_IMG.exec(html))) {
    const tag = m[0];
    const src = atributo(tag, "src");
    saida.push({
      indice: i++,
      prompt: m[1],
      src,
      alt: atributo(tag, "alt"),
      gerada: Boolean(src) && !src.startsWith("data:"),
      orientacao: orientacaoDaTag(tag),
    });
  }
  return saida;
}

// Troca o src (e opcionalmente o prompt) da n-ésima imagem marcada.
export function trocarImagemHtml(
  html: string,
  indice: number,
  novaUrl: string,
  novoPrompt?: string,
): string {
  let i = 0;
  RE_IMG.lastIndex = 0;
  return html.replace(RE_IMG, (tag) => {
    if (i++ !== indice) return tag;
    let nova = /\bsrc\s*=\s*"[^"]*"/i.test(tag)
      ? tag.replace(/\bsrc\s*=\s*"[^"]*"/i, `src="${novaUrl}"`)
      : tag.replace(/<img\b/i, `<img src="${novaUrl}"`);
    if (novoPrompt !== undefined) {
      nova = nova.replace(
        /\bdata-ia-prompt\s*=\s*"[^"]*"/i,
        `data-ia-prompt="${novoPrompt.replace(/"/g, "&quot;")}"`,
      );
    }
    return nova;
  });
}
