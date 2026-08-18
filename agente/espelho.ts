/*
 * O Espelho: tira um print do site ATUAL do lead.
 *
 * É a metade "hoje" da página de comparação — o painel junta este print com
 * o site novo e monta o "hoje × amanhã". O print é tirado aqui, no agente,
 * porque é ele quem tem navegador de verdade; a imagem sobe em base64 e quem
 * grava no Storage é o servidor, como nas fotos do Instagram.
 *
 * Navegador descartável e separado: nada de encostar no perfil do WhatsApp.
 */

import { chromium } from "playwright";

import * as api from "./api.ts";

export type ResultadoEspelho = { ok: boolean; resumo: string };

export async function capturarEspelhoDoProspecto(
  prospectoId: string,
  headless: boolean,
  log: (m: string) => void,
): Promise<ResultadoEspelho> {
  const p = await api.prospectoIg(prospectoId);
  if (!p) return { ok: false, resumo: "Empresa não encontrada." };
  if (!p.website) {
    await api.gravarEspelho({ id: prospectoId, ok: false, erro: "Esta empresa não tem site cadastrado." });
    return { ok: false, resumo: "sem site cadastrado" };
  }

  const url = /^https?:\/\//i.test(p.website) ? p.website : `https://${p.website}`;

  /*
   * O endereço veio de fora (cadastro do Google Maps) e este navegador roda
   * DENTRO da rede do cliente. Sem este filtro, um "website" apontando para
   * 192.168.0.1 faria o agente fotografar o roteador da casa do cliente e
   * subir o print para o Storage. Site de lead é site público — endereço de
   * rede interna não passa.
   */
  let hostAlvo = "";
  try {
    hostAlvo = new URL(url).hostname.toLowerCase();
  } catch {
    return { ok: false, resumo: `endereço inválido: ${p.website}` };
  }
  const interno =
    /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0$|\[?::1\]?$)/.test(hostAlvo) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostAlvo) ||
    hostAlvo.endsWith(".local") ||
    !hostAlvo.includes(".");
  if (interno) {
    await api.gravarEspelho({ id: prospectoId, ok: false, erro: "Endereço de rede interna — ignorado." });
    return { ok: false, resumo: `endereço interno bloqueado (${hostAlvo})` };
  }

  log(`abrindo ${url}`);

  const browser = await chromium.launch({
    headless,
    args: ["--disable-dev-shm-usage", "--no-sandbox", "--disable-gpu"],
  });
  try {
    const page = await browser.newPage({
      // Alto de propósito: um print curto esconderia o quanto o site velho é
      // vazio — e é exatamente isso que a comparação precisa mostrar.
      viewport: { width: 1280, height: 1600 },
      locale: "pt-BR",
    });
    try {
      await page.goto(url, { waitUntil: "load", timeout: 45_000 });
    } catch {
      // "load" nunca chega em site que fica carregando anúncio — o que já
      // pintou na tela costuma bastar.
      if (page.url() === "about:blank") throw new Error("O site não abriu.");
    }
    // Fontes e imagens preguiçosas: um respiro antes do clique.
    await page.waitForTimeout(3500);

    const png = await page.screenshot({ type: "jpeg", quality: 72, timeout: 15_000 });
    if (png.byteLength < 10_000) {
      throw new Error("A página veio vazia (print de menos de 10KB).");
    }

    const r = await api.gravarEspelho({ id: prospectoId, ok: true, base64: png.toString("base64") });
    if (!r.ok) return { ok: false, resumo: r.erro ?? "O painel recusou o print." };
    return { ok: true, resumo: `print do site atual salvo (${Math.round(png.byteLength / 1024)}KB)` };
  } catch (e) {
    const motivo = (e as Error).message.slice(0, 200);
    await api
      .gravarEspelho({ id: prospectoId, ok: false, erro: motivo })
      .catch(() => {});
    return { ok: false, resumo: `o site atual não abriu: ${motivo}` };
  } finally {
    await browser.close().catch(() => {});
  }
}
