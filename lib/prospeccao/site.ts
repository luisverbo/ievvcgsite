import type { AnaliseSite } from "./score";

// Sem o guard "server-only" de propósito: este módulo é compartilhado com o
// agente local (agente/prospectar.ts), que roda no Node do seu computador.
// Ele só faz fetch e não guarda segredo nenhum.

// Olhada rápida no site da empresa — só o suficiente para saber se é um site
// vivo e moderno (pula o prospect) ou um site velho/quebrado (continua sendo
// oportunidade). Não é auditoria: é triagem.

/*
 * Endereço de rede interna não é site de empresa.
 *
 * A URL vem de cadastro público (OpenStreetMap/Google) — dado que qualquer
 * um edita. Sem este filtro, um cadastro envenenado com "10.0.0.5" faria o
 * NOSSO servidor (ou o agente, na casa do cliente) disparar requisições para
 * dentro da rede onde roda. É o SSRF de manual, e a defesa é recusar o alvo.
 */
function enderecoInterno(endereco: string): boolean {
  try {
    const h = new URL(endereco).hostname.toLowerCase();
    return (
      /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0$)/.test(h) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
      h === "::1" || h === "[::1]" ||
      h.endsWith(".local") || h.endsWith(".internal") ||
      !h.includes(".")
    );
  } catch {
    return true;
  }
}

export async function analisarSite(url: string): Promise<AnaliseSite> {
  const endereco = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  if (enderecoInterno(endereco)) {
    return { acessivel: false, responsivo: false, https: false };
  }

  try {
    const res = await fetch(endereco, {
      redirect: "follow",
      headers: {
        // Sem User-Agent de navegador muitos sites devolvem 403 e a gente
        // classificaria como "fora do ar" sem ele estar.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) return { acessivel: false, responsivo: false, https: endereco.startsWith("https") };

    // Só o começo do documento: o <head> basta e evita baixar página inteira.
    const html = (await res.text()).slice(0, 120_000);
    const baixo = html.toLowerCase();

    // Sem <meta viewport> o site não se adapta ao celular. <font> e frameset
    // são HTML de duas décadas atrás — denunciam site nunca refeito.
    const temViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
    const htmlAntigo = baixo.includes("<font") || baixo.includes("frameset");
    const responsivo = temViewport && !htmlAntigo;

    // Ano mais recente citado como copyright — denuncia site abandonado.
    let anoRodape: number | undefined;
    const anoAtual = new Date().getFullYear();
    for (const m of html.matchAll(/(?:©|&copy;|copyright)[^0-9]{0,20}((?:19|20)\d{2})/gi)) {
      const ano = Number(m[1]);
      if (ano >= 1995 && ano <= anoAtual && (anoRodape === undefined || ano > anoRodape)) {
        anoRodape = ano;
      }
    }

    return {
      acessivel: true,
      responsivo,
      anoRodape,
      https: res.url.startsWith("https://") || endereco.startsWith("https://"),
    };
  } catch {
    // Timeout, DNS morto, certificado inválido: para o prospect, é site fora
    // do ar — e isso é uma boa notícia comercial.
    return { acessivel: false, responsivo: false, https: false };
  }
}
