// Separa o documento que a Claude escreveu em CSS + páginas soltas.
// Puro de propósito: roda no servidor e no navegador, e dá para testar.

export type EbookHtml = { estilo: string; paginas: string[] };

const RE_STYLE = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
const RE_PG = /<section\b[^>]*\bclass\s*=\s*"[^"]*\bpg\b[^"]*"[^>]*>([\s\S]*?)<\/section>/gi;

// Scripts nunca são necessários num ebook — e o leitor mostra este HTML em
// shadow DOM (sem isolamento de origem), então tiramos por segurança.
function semScript(html: string) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "");
}

export function separarEbookHtml(html: string): EbookHtml {
  const limpo = semScript(html || "");

  let estilo = "";
  let m: RegExpExecArray | null;
  RE_STYLE.lastIndex = 0;
  while ((m = RE_STYLE.exec(limpo))) estilo += `${m[1]}\n`;

  const paginas: string[] = [];
  RE_PG.lastIndex = 0;
  while ((m = RE_PG.exec(limpo))) paginas.push(m[0]);

  return { estilo: estilo.trim(), paginas };
}

// Conta quantas páginas o documento tem, sem montar o resto.
export function contarPaginas(html: string): number {
  return separarEbookHtml(html).paginas.length;
}
