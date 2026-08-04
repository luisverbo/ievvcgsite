// Prepara a página para virar um site solto, hospedável em qualquer lugar.
// Puro de propósito: dá para testar sem rede nem banco.

const RE_URL_IMAGEM =
  /https?:\/\/[^\s"'()<>]+?\.(?:png|jpe?g|webp|gif|avif)(?:\?[^\s"'()<>]*)?/gi;

// Todas as imagens remotas citadas no documento (em <img src>, em
// background-image, em og:image — a busca é pelo endereço, não pela tag).
export function listarUrlsRemotas(html: string): string[] {
  return [...new Set(html.match(RE_URL_IMAGEM) ?? [])];
}

// Nome de arquivo seguro e único para cada URL.
export function nomearArquivos(urls: string[]): Map<string, string> {
  const mapa = new Map<string, string>();
  const usados = new Set<string>();

  urls.forEach((url, i) => {
    const semQuery = url.split("?")[0];
    const base = (semQuery.split("/").pop() || `imagem-${i}`)
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, "-")
      .replace(/-+/g, "-")
      .slice(-60);
    const ponto = base.lastIndexOf(".");
    const nome = ponto > 0 ? base.slice(0, ponto) : base;
    const ext = ponto > 0 ? base.slice(ponto) : ".png";

    let final = `${nome}${ext}`;
    let n = 2;
    while (usados.has(final)) final = `${nome}-${n++}${ext}`;
    usados.add(final);
    mapa.set(url, `imagens/${final}`);
  });

  return mapa;
}

// Troca cada endereço remoto pelo caminho local. Substitui em qualquer lugar
// do documento, não só dentro de <img>.
export function reescreverCaminhos(html: string, mapa: Map<string, string>): string {
  let saida = html;
  // Do mais longo para o mais curto: evita que uma URL que é prefixo de outra
  // corrompa a substituição.
  for (const url of [...mapa.keys()].sort((a, b) => b.length - a.length)) {
    saida = saida.split(url).join(mapa.get(url)!);
  }
  return saida;
}

export function leiaMe(titulo: string, endereco: string) {
  return `${titulo}
${"=".repeat(titulo.length)}

Este é o site completo, pronto para hospedar em qualquer lugar.

O QUE TEM AQUI
  index.html    -> a página inteira (HTML, CSS e JavaScript juntos)
  imagens/      -> as fotos usadas na página

COMO COLOCAR NO AR
  1. Envie TODOS os arquivos desta pasta (incluindo a pasta "imagens")
     para a hospedagem, na pasta pública — costuma se chamar
     public_html, www ou htdocs.
  2. Pronto. O endereço do domínio já abre a página.

  Serve em qualquer hospedagem: Hostinger, Locaweb, KingHost, cPanel,
  Netlify, Vercel, GitHub Pages, Cloudflare Pages. Não precisa de banco
  de dados, PHP, Node nem instalação de nada.

ANTES DE PUBLICAR, CONFIRA
  - Os links dos botões de compra/contato apontam para o lugar certo.
  - Textos, preços e dados de contato estão corretos.

OBSERVAÇÕES
  - As fontes são carregadas do Google Fonts, então o computador de quem
    visita precisa de internet (o normal em qualquer site).
  - Esta cópia NÃO inclui o rastreio de visitas do painel nem o Pixel:
    ela é um site independente. Para medir aqui, cole o código de
    acompanhamento que você usar antes de </body> no index.html.

Gerado em ${endereco}
`;
}
