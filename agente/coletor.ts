/*
 * Coleta de empresas no Google Maps com navegador de verdade.
 * Compartilhado pelo comando manual (prospectar.ts) e pelo serviço da fila
 * (servico.ts) — uma implementação só, sem risco de as duas divergirem.
 *
 * Regras: nunca burla CAPTCHA, login ou bloqueio. Detecta, avisa e para.
 */

import { chromium, type BrowserContext, type Page } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { termoDeBusca } from "../lib/prospeccao/nichos.ts";
import type { EmpresaEncontrada } from "../lib/prospeccao/tipos.ts";
import {
  FILTROS_VAZIOS,
  passaNosFiltros,
  temFiltro,
  type FiltrosBusca,
} from "../lib/prospeccao/filtros.ts";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PERFIL = path.join(AQUI, ".perfil-navegador");
const DIAGNOSTICO = path.join(AQUI, "diagnostico");

export type OpcoesColeta = {
  headless?: boolean;
  pausaMs?: number;
  debug?: boolean;
  log?: (msg: string) => void;
  aoProgredir?: (lidas: number, total: number) => void | Promise<void>;
  filtros?: FiltrosBusca;
  /*
   * "Destes fonte_ids, quais já estão na lista do cliente?" — respondido
   * pelo painel. Com isto o agente pula as repetidas ANTES de abrir a ficha:
   * é a diferença entre 5 segundos e 0 por empresa já conhecida.
   */
  jaExistem?: (fonteIds: string[]) => Promise<string[]>;
};

export type ResultadoColeta = {
  empresas: EmpresaEncontrada[];
  falhas: number;
  bloqueio: string | null;
  /* Quantas foram abertas e descartadas por não passarem no filtro. */
  descartadas: number;
  /* Quantas já estavam na lista do cliente e foram puladas sem abrir. */
  repetidas: number;
};

/* O id estável de uma ficha do Maps — o mesmo que vai para o banco. */
export function fonteIdDaUrl(url: string): string {
  return decodeURIComponent(url.split("/maps/place/")[1] ?? url).slice(0, 200);
}

/*
 * Quantas fichas abrir quando há filtro.
 *
 * Com filtro, boa parte do que a lista traz vai ser descartada — se
 * abríssemos só as 20 pedidas, o cliente que pediu "20 sem site" receberia
 * 6 e acharia que a ferramenta é fraca. Então a busca continua abrindo até
 * COMPLETAR as 20, com um teto para não virar uma varredura infinita quando
 * o filtro é apertado demais para aquele bairro.
 */
const FATOR_FILTRO = 4;
const TETO_FICHAS = 150;

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* --------------------------------- parsing -------------------------------- */
// "4,8" vira 4.8; "1.234" vira 1234 (separador de milhar brasileiro).
export function numeroBr(texto: string | undefined | null): number | undefined {
  if (!texto) return undefined;
  const limpo = texto.replace(/\s/g, "");
  const decimal = /^\d+[.,]\d$/.test(limpo);
  const n = decimal ? Number(limpo.replace(",", ".")) : Number(limpo.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

// "Endereço: Av. X, 100" -> "Av. X, 100"
export function semRotulo(s?: string) {
  return s?.replace(/^[^:]*:\s*/, "").trim() || undefined;
}

/* --------------------------------- página --------------------------------- */
async function texto(page: Page, seletor: string): Promise<string | undefined> {
  try {
    const el = page.locator(seletor).first();
    if ((await el.count()) === 0) return undefined;
    return (await el.textContent({ timeout: 3000 }))?.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function atributo(page: Page, seletor: string, attr: string): Promise<string | undefined> {
  try {
    const el = page.locator(seletor).first();
    if ((await el.count()) === 0) return undefined;
    return (await el.getAttribute(attr, { timeout: 3000 }))?.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function estaBloqueado(page: Page): Promise<string | null> {
  const url = page.url();
  if (url.includes("/sorry/") || url.includes("captcha")) return "CAPTCHA do Google";
  if (url.includes("accounts.google.com")) return "pedido de login";
  const corpo = (await page.textContent("body").catch(() => "")) ?? "";
  if (/tráfego incomum|unusual traffic|não é um robô|not a robot/i.test(corpo)) {
    return "aviso de tráfego incomum";
  }
  return null;
}

// Consentimento de cookies não é bloqueio de segurança — é o mesmo aceite que
// qualquer pessoa faz ao abrir o Google pela primeira vez.
async function aceitarConsentimento(page: Page, log: (m: string) => void) {
  for (const sel of [
    'button:has-text("Aceitar tudo")',
    'button:has-text("Aceitar todos")',
    'button:has-text("Accept all")',
    'form[action*="consent"] button',
  ]) {
    const b = page.locator(sel).first();
    if ((await b.count()) > 0) {
      await b.click({ timeout: 5000 }).catch(() => {});
      log("consentimento de cookies aceito");
      await page.waitForLoadState("domcontentloaded").catch(() => {});
      return;
    }
  }
}

async function coletarLinks(page: Page, alvo: number, log: (m: string) => void) {
  const feed = page.locator('div[role="feed"]').first();
  await feed.waitFor({ timeout: 25_000 });

  const links = new Set<string>();
  let semNovidade = 0;

  for (let volta = 0; volta < 40 && links.size < alvo && semNovidade < 4; volta++) {
    const antes = links.size;
    const achados = await page
      .locator('a[href*="/maps/place/"]')
      .evaluateAll((as: Element[]) => as.map((a) => (a as HTMLAnchorElement).href));
    for (const href of achados) links.add(href.split("?")[0]);

    semNovidade = links.size === antes ? semNovidade + 1 : 0;
    log(`rolando… ${links.size} empresas na lista`);
    await feed.evaluate((el: HTMLElement) => el.scrollBy(0, el.scrollHeight)).catch(() => {});
    await espera(1200);

    if ((await page.getByText(/chegou ao fim da lista|end of the list/i).count()) > 0) break;
  }

  return [...links].slice(0, alvo);
}

async function extrair(page: Page, url: string): Promise<EmpresaEncontrada | null> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 40_000 });
  await page
    .locator("h1")
    .first()
    .waitFor({ timeout: 20_000 })
    .catch(() => {});

  const nome = await texto(page, "h1");
  if (!nome) return null;

  // data-item-id são os seletores mais estáveis do painel do Google Maps.
  const enderecoBruto =
    (await atributo(page, 'button[data-item-id="address"]', "aria-label")) ??
    (await texto(page, 'button[data-item-id="address"]'));
  const telefoneBruto =
    (await atributo(page, 'button[data-item-id^="phone"]', "aria-label")) ??
    (await texto(page, 'button[data-item-id^="phone"]'));
  const website =
    (await atributo(page, 'a[data-item-id="authority"]', "href")) ??
    (await atributo(page, 'a[data-item-id^="authority"]', "href"));
  const categoria =
    (await texto(page, 'button[jsaction*="category"]')) ??
    (await atributo(page, 'meta[itemprop="name"]', "content"));

  let notaMedia = numeroBr(
    (await atributo(page, 'div[role="img"][aria-label*="estrela"]', "aria-label"))?.match(
      /([\d.,]+)/,
    )?.[1],
  );
  let avaliacoes = numeroBr(
    (await atributo(page, 'button[aria-label*="avaliaç"]', "aria-label"))?.match(
      /([\d.]+)\s*avalia/i,
    )?.[1],
  );
  if (notaMedia === undefined || avaliacoes === undefined) {
    const bloco = (await texto(page, "div.F7nice")) ?? "";
    notaMedia ??= numeroBr(bloco.match(/^([\d.,]+)/)?.[1]);
    avaliacoes ??= numeroBr(bloco.match(/\(([\d.]+)\)/)?.[1]);
  }
  // Perfil existe mas sem nenhuma avaliação: isso é informação, não ausência.
  if (avaliacoes === undefined && notaMedia === undefined) avaliacoes = 0;

  return {
    fonte_id: fonteIdDaUrl(url),
    nome,
    categoria: categoria?.trim(),
    endereco: semRotulo(enderecoBruto),
    telefone: semRotulo(telefoneBruto),
    website: website && !website.includes("google.com") ? website : undefined,
    temHorario: (await page.locator('[data-item-id*="oh"]').count()) > 0,
    temEmail: false,
    avaliacoes,
    notaMedia,
    fonteUrl: url,
  };
}

/* ---------------------------------- coleta -------------------------------- */
export async function coletarDoGoogle(
  nichoChave: string,
  local: string,
  limite: number,
  op: OpcoesColeta = {},
): Promise<ResultadoColeta> {
  const log = op.log ?? (() => {});
  const pausa = Math.max(800, op.pausaMs ?? 1800);
  const filtros = op.filtros ?? FILTROS_VAZIOS;
  const filtrando = temFiltro(filtros);
  const pulandoRepetidas = Boolean(filtros.evitarRepetidas && op.jaExistem);
  // Com filtro ou pulando repetidas, junta mais links do que o alvo — muitos
  // vão ser descartados antes ou depois de abrir.
  const alvoLinks =
    filtrando || pulandoRepetidas ? Math.min(TETO_FICHAS, limite * FATOR_FILTRO) : limite;
  /*
   * Nicho fora do catálogo NÃO é erro: é o ramo que o dono digitou à mão
   * ("loja de aquário") — o Maps busca por texto e acha do mesmo jeito. O
   * catálogo só serve para trocar a chave pelo rótulo bonito.
   */
  const termo = `${termoDeBusca(nichoChave)} ${local}`;
  let ctx: BrowserContext | undefined;

  try {
    ctx = await chromium.launchPersistentContext(PERFIL, {
      headless: op.headless ?? false,
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      viewport: { width: 1280, height: 900 },
      // --disable-dev-shm-usage é obrigatório em VPS: a /dev/shm padrão é
      // pequena demais e o Chromium morre no meio da navegação.
      args: ["--disable-dev-shm-usage", "--no-sandbox", "--disable-gpu"],
    });
    const page = ctx.pages()[0] ?? (await ctx.newPage());

    // gl=BR força resultados do Brasil mesmo com a VPS fora do país.
    await page.goto(
      `https://www.google.com/maps/search/${encodeURIComponent(termo)}?hl=pt-BR&gl=BR`,
      { waitUntil: "domcontentloaded", timeout: 60_000 },
    );
    await aceitarConsentimento(page, log);

    const bloqueio = await estaBloqueado(page);
    if (bloqueio) return { empresas: [], falhas: 0, bloqueio, descartadas: 0, repetidas: 0 };

    let links = await coletarLinks(page, alvoLinks, log);

    /*
     * Pula o que o cliente já tem — sem abrir ficha nenhuma.
     *
     * Pergunta ao painel quais destes ids já existem na lista (de QUALQUER
     * busca anterior) e tira da fila. Falhou a pergunta? Segue com todos:
     * uma repetida gravada de novo só atualiza a linha; um "erro de rede"
     * que cancela a busca inteira é bem pior.
     */
    let repetidas = 0;
    if (pulandoRepetidas) {
      try {
        const existentes = new Set(await op.jaExistem!(links.map(fonteIdDaUrl)));
        const antes = links.length;
        links = links.filter((l) => !existentes.has(fonteIdDaUrl(l)));
        repetidas = antes - links.length;
        if (repetidas > 0) log(`${repetidas} já estavam na sua lista — pulei sem abrir`);
      } catch (e) {
        log(`não consegui conferir repetidas (${(e as Error).message.slice(0, 60)}); sigo com todas`);
      }
    }
    log(
      filtrando
        ? `${links.length} empresas na lista; abrindo até completar ${limite} que passem no filtro`
        : `${links.length} empresas na lista; abrindo uma a uma`,
    );
    // O progresso é contado sobre o ALVO quando há filtro: a barra tem que
    // medir o que o cliente pediu, não quantas fichas foram descartadas.
    const totalBarra = filtrando ? limite : links.length;
    await op.aoProgredir?.(0, totalBarra);

    const empresas: EmpresaEncontrada[] = [];
    let falhas = 0;
    let descartadas = 0;

    for (const [i, link] of links.entries()) {
      // Alvo atingido: nem abre o resto — é tempo e é exposição ao Google.
      if (empresas.length >= limite) break;
      try {
        const e = await extrair(page, link);
        if (!e) {
          falhas++;
          log(`${i + 1}/${links.length} não consegui ler os dados`);
        } else if (!passaNosFiltros(e, filtros)) {
          descartadas++;
          log(`${i + 1}/${links.length} ${e.nome} — fora do filtro, pulei`);
        } else {
          empresas.push(e);
          log(
            `${empresas.length}/${limite} ${e.nome} — ${e.website ? "tem site" : "SEM SITE"}` +
              (e.avaliacoes ? ` · ${e.avaliacoes} avaliações` : ""),
          );
        }
      } catch (err) {
        falhas++;
        log(`${i + 1}/${links.length} falhou: ${(err as Error).message.slice(0, 90)}`);
        if (op.debug) {
          fs.mkdirSync(DIAGNOSTICO, { recursive: true });
          await page
            .screenshot({ path: path.join(DIAGNOSTICO, `erro-${i + 1}.png`) })
            .catch(() => {});
          fs.writeFileSync(
            path.join(DIAGNOSTICO, `erro-${i + 1}.html`),
            await page.content().catch(() => ""),
          );
        }
      }

      await op.aoProgredir?.(filtrando ? empresas.length : i + 1, totalBarra);

      const b = await estaBloqueado(page);
      if (b) return { empresas, falhas, bloqueio: b, descartadas, repetidas };
      await espera(pausa);
    }

    if (filtrando && empresas.length < limite) {
      log(
        `o filtro é apertado para esta região: ${empresas.length} passaram de ${links.length} abertas`,
      );
    }

    return { empresas, falhas, bloqueio: null, descartadas, repetidas };
  } finally {
    await ctx?.close().catch(() => {});
  }
}
