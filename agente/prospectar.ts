/*
 * Agente local de prospecção.
 *
 * Roda no SEU computador (não na Vercel): abre um navegador de verdade, com
 * seu IP residencial, pesquisa empresas e grava direto no Supabase. O painel
 * mostra o resultado como se tivesse vindo da busca de lá.
 *
 * Uso:
 *   npm run prospectar -- --nicho=dentista --local="Barra da Tijuca, RJ" --limite=20
 *
 * Regras que ele respeita:
 *   - nunca tenta burlar CAPTCHA, login ou bloqueio: detecta, avisa e para;
 *   - espera entre uma empresa e outra, para não martelar o servidor;
 *   - não inventa dado: campo que não achou fica vazio.
 */

import { chromium, type BrowserContext, type Page } from "playwright";
import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { calcularPotencial, ehEnderecoSocial } from "../lib/prospeccao/score.ts";
import { analisarSite } from "../lib/prospeccao/site.ts";
import { acharNicho, NICHOS } from "../lib/prospeccao/nichos.ts";
import type { EmpresaEncontrada } from "../lib/prospeccao/tipos.ts";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PERFIL = path.join(AQUI, ".perfil-navegador");
const DIAGNOSTICO = path.join(AQUI, "diagnostico");

/* ------------------------------- argumentos ------------------------------- */
function arg(nome: string): string | undefined {
  const achado = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return achado?.slice(nome.length + 3);
}
const temFlag = (nome: string) => process.argv.includes(`--${nome}`);

const NICHO = arg("nicho") ?? "";
const LOCAL = arg("local") ?? "";
const LIMITE = Math.min(120, Math.max(1, Number(arg("limite")) || 20));
const HEADLESS = temFlag("headless");
const DEBUG = temFlag("debug");
const PAUSA_MS = Math.max(800, Number(arg("pausa")) || 1800);

/* --------------------------------- utils ---------------------------------- */
const log = (...a: unknown[]) => console.log(...a);
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

// "4,8" e "4.8" viram 4.8; "(1.234)" vira 1234.
function numeroBr(texto: string | undefined | null): number | undefined {
  if (!texto) return undefined;
  const limpo = texto.replace(/\s/g, "");
  const decimal = /^\d+[.,]\d$/.test(limpo);
  const n = decimal
    ? Number(limpo.replace(",", "."))
    : Number(limpo.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

async function texto(page: Page, seletor: string): Promise<string | undefined> {
  try {
    const el = page.locator(seletor).first();
    if ((await el.count()) === 0) return undefined;
    const t = (await el.textContent({ timeout: 3000 }))?.trim();
    return t || undefined;
  } catch {
    return undefined;
  }
}

async function atributo(page: Page, seletor: string, attr: string): Promise<string | undefined> {
  try {
    const el = page.locator(seletor).first();
    if ((await el.count()) === 0) return undefined;
    const v = (await el.getAttribute(attr, { timeout: 3000 }))?.trim();
    return v || undefined;
  } catch {
    return undefined;
  }
}

/* ------------------------------- bloqueios -------------------------------- */
// CAPTCHA ou muro de login: registra e para com segurança, sem tentar burlar.
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

// A tela de consentimento de cookies não é bloqueio de segurança — é o mesmo
// aceite que qualquer pessoa faz ao abrir o Google pela primeira vez.
async function aceitarConsentimento(page: Page) {
  const botoes = [
    'button:has-text("Aceitar tudo")',
    'button:has-text("Aceitar todos")',
    'button:has-text("Accept all")',
    'form[action*="consent"] button',
  ];
  for (const sel of botoes) {
    const b = page.locator(sel).first();
    if ((await b.count()) > 0) {
      await b.click({ timeout: 5000 }).catch(() => {});
      log("   consentimento de cookies aceito");
      await page.waitForLoadState("domcontentloaded").catch(() => {});
      return;
    }
  }
}

/* ----------------------------- coleta da lista ---------------------------- */
async function coletarLinks(page: Page, alvo: number): Promise<string[]> {
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

    if (links.size === antes) semNovidade++;
    else semNovidade = 0;

    log(`   rolando… ${links.size} empresas na lista`);
    await feed.evaluate((el: HTMLElement) => el.scrollBy(0, el.scrollHeight)).catch(() => {});
    await espera(1200);

    const fim = await page.getByText(/chegou ao fim da lista|end of the list/i).count();
    if (fim > 0) break;
  }

  return [...links].slice(0, alvo);
}

/* --------------------------- dados de uma empresa ------------------------- */
async function extrair(page: Page, url: string): Promise<EmpresaEncontrada | null> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 40_000 });
  await page.locator("h1").first().waitFor({ timeout: 20_000 }).catch(() => {});

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

  // Nota e nº de avaliações: tenta o aria-label (mais estável) e cai no texto.
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
  // Perfil existe mas sem nenhuma avaliação: é informação, não ausência.
  if (avaliacoes === undefined && notaMedia === undefined) avaliacoes = 0;

  const limpar = (s?: string) => s?.replace(/^[^:]*:\s*/, "").trim() || undefined;

  return {
    fonte_id: decodeURIComponent(url.split("/maps/place/")[1] ?? url).slice(0, 200),
    nome,
    categoria: categoria?.trim(),
    endereco: limpar(enderecoBruto),
    telefone: limpar(telefoneBruto),
    website: website && !website.includes("google.com") ? website : undefined,
    lat: undefined,
    lon: undefined,
    temHorario: (await page.locator('[data-item-id*="oh"]').count()) > 0,
    temEmail: false,
    avaliacoes,
    notaMedia,
    fonteUrl: url,
  };
}

/* --------------------------------- main ----------------------------------- */
async function main() {
  const nicho = acharNicho(NICHO);
  if (!nicho || LOCAL.length < 3) {
    log("\nUso:");
    log('  npm run prospectar -- --nicho=dentista --local="Barra da Tijuca, RJ" --limite=20\n');
    log("Opções: --headless (sem janela)  --debug (salva print quando falhar)  --pausa=2000");
    log(`\nNichos: ${NICHOS.map((n) => n.chave).join(", ")}\n`);
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    log("\n❌ Faltam as variáveis. Crie o arquivo agente/.env a partir do .env.example.\n");
    process.exit(1);
  }
  const supabase = createClient(url, chave, { auth: { persistSession: false } });

  const orgId =
    arg("org") ??
    (
      await supabase.from("organizacoes").select("id").order("created_at").limit(1).maybeSingle()
    ).data?.id;
  if (!orgId) {
    log("\n❌ Não achei sua organização no Supabase. Passe --org=<uuid>.\n");
    process.exit(1);
  }

  const termo = `${nicho.rotulo.split("/")[0].trim()} ${LOCAL}`;
  log(`\n🔎 Buscando "${termo}" — até ${LIMITE} empresas`);
  log(`   navegador ${HEADLESS ? "oculto" : "visível"} · pausa de ${PAUSA_MS}ms entre empresas\n`);

  let ctx: BrowserContext | undefined;
  try {
    // Perfil persistente: o consentimento de cookies fica salvo e o navegador
    // se comporta como o seu de sempre.
    ctx = await chromium.launchPersistentContext(PERFIL, {
      headless: HEADLESS,
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      viewport: { width: 1280, height: 900 },
      args: ["--disable-blink-features=AutomationControlled"],
    });
    const page = ctx.pages()[0] ?? (await ctx.newPage());

    await page.goto(
      `https://www.google.com/maps/search/${encodeURIComponent(termo)}?hl=pt-BR`,
      { waitUntil: "domcontentloaded", timeout: 60_000 },
    );
    await aceitarConsentimento(page);

    const bloqueio = await estaBloqueado(page);
    if (bloqueio) {
      log(`\n⛔ O Google mostrou ${bloqueio}.`);
      log("   Parando por aqui — não vou tentar burlar.");
      log("   Espere alguns minutos, ou rode sem --headless e resolva na janela.\n");
      return;
    }

    const links = await coletarLinks(page, LIMITE);
    log(`\n✅ ${links.length} empresas na lista. Abrindo uma a uma…\n`);

    const empresas: EmpresaEncontrada[] = [];
    let falhas = 0;

    for (const [i, link] of links.entries()) {
      try {
        const e = await extrair(page, link);
        if (!e) {
          falhas++;
          log(`   ${i + 1}/${links.length} ⚠️  não consegui ler os dados`);
        } else {
          empresas.push(e);
          const marca = e.website ? "tem site" : "SEM SITE";
          log(
            `   ${i + 1}/${links.length} ${e.nome} — ${marca}${
              e.avaliacoes ? ` · ${e.avaliacoes} avaliações` : ""
            }`,
          );
        }
      } catch (err) {
        falhas++;
        log(`   ${i + 1}/${links.length} ⚠️  falhou: ${(err as Error).message.slice(0, 80)}`);
        if (DEBUG) {
          fs.mkdirSync(DIAGNOSTICO, { recursive: true });
          await page
            .screenshot({ path: path.join(DIAGNOSTICO, `erro-${i + 1}.png`), fullPage: false })
            .catch(() => {});
          fs.writeFileSync(
            path.join(DIAGNOSTICO, `erro-${i + 1}.html`),
            await page.content().catch(() => ""),
          );
        }
      }

      if (await estaBloqueado(page)) {
        log("\n⛔ O Google começou a bloquear. Parando com o que já foi coletado.\n");
        break;
      }
      await espera(PAUSA_MS);
    }

    if (empresas.length === 0) {
      log("\n❌ Nenhuma empresa lida. Os seletores do Google podem ter mudado.");
      log("   Rode de novo com --debug e me mande os arquivos de agente/diagnostico/.\n");
      return;
    }

    // Confere o site de quem tem, para separar "site bom" de "site de 2015".
    log("\n🔬 Conferindo os sites…");
    const analises = await Promise.all(
      empresas.map((e) =>
        e.website && !ehEnderecoSocial(e.website)
          ? analisarSite(e.website).catch(() => null)
          : Promise.resolve(null),
      ),
    );

    const linhas = empresas.map((e, i) => {
      const p = calcularPotencial(e, NICHO, analises[i]);
      return {
        org_id: orgId,
        fonte: "google",
        fonte_id: e.fonte_id,
        nome: e.nome,
        categoria: e.categoria ?? null,
        endereco: e.endereco ?? null,
        telefone: e.telefone ?? null,
        website: e.website ?? null,
        nicho_busca: NICHO,
        local_busca: LOCAL,
        situacao: p.situacao,
        pontuacao: p.pontuacao,
        eixos: p.eixos,
        motivos: p.motivos,
        avaliacoes: e.avaliacoes ?? null,
        nota_media: e.notaMedia ?? null,
        fonte_url: e.fonteUrl ?? null,
      };
    });

    const { error } = await supabase
      .from("prospeccao")
      .upsert(linhas, { onConflict: "org_id,fonte,fonte_id", ignoreDuplicates: false });
    if (error) {
      log(`\n❌ Falha ao gravar no Supabase: ${error.message}\n`);
      return;
    }

    const semSite = linhas.filter((l) => l.situacao !== "site_moderno").length;
    const quentes = linhas.filter((l) => l.pontuacao >= 75).length;
    log("\n────────────────────────────────────────");
    log(`✅ ${linhas.length} empresas gravadas no painel`);
    log(`   ${semSite} com oportunidade real · ${quentes} de prioridade alta (nota 75+)`);
    if (falhas) log(`   ${falhas} não puderam ser lidas`);
    log("\n   Veja em: /app/admin/prospeccao\n");
  } catch (e) {
    log(`\n❌ ${(e as Error).message}\n`);
  } finally {
    await ctx?.close().catch(() => {});
  }
}

main();
