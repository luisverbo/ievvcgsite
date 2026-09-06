/*
 * Envio pelo WhatsApp Web, com navegador de verdade.
 *
 * A sessão fica num perfil separado do usado no Google Maps, e é persistente:
 * você lê o QR uma vez e ele continua conectado. O QR aparece no painel —
 * o agente tira uma foto dele e grava no banco.
 *
 * Cuidados embutidos (o número é seu, e banimento é definitivo):
 *   - limite diário e intervalo aleatório entre envios;
 *   - conferência de que o número tem WhatsApp antes de mandar;
 *   - parada imediata se a sessão cair ou algo estranho aparecer.
 */

import { chromium, type BrowserContext, type Page } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
// Fotos da tela quando um envio falha — a única forma de ver o que o
// WhatsApp mostrou numa VPS sem monitor. Ficam só as 6 mais recentes.
const DIAGNOSTICO = path.join(AQUI, "diagnostico");
// O perfil da linha PRINCIPAL — o de sempre. As outras linhas ganham uma
// pasta cada (perfilDaLinha): cada número é uma sessão, um navegador.
export const PERFIL_ZAP = path.join(AQUI, ".perfil-whatsapp");

export function perfilDaLinha(linhaId: string): string {
  return path.join(AQUI, `.perfil-whatsapp-${linhaId.replace(/[^a-z0-9-]/gi, "")}`);
}

export type EstadoZap = "desconectado" | "aguardando_qr" | "conectado" | "erro";

export type SessaoZap = {
  ctx: BrowserContext;
  page: Page;
};

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/*
 * O Chromium do Playwright é o Chrome 151, mas em modo oculto ele se
 * identifica como "HeadlessChrome" — e o WhatsApp Web lê isso como navegador
 * desconhecido, recusando com "funciona no Google Chrome 100 ou posterior".
 *
 * Corrigir esse rótulo não é disfarce: é declarar a versão real do motor que
 * está rodando. Descobrimos a versão do navegador instalado em vez de fixar
 * um número, para não envelhecer a cada atualização.
 */
let userAgentCache: string | null = null;

async function userAgentDeNavegador(): Promise<string> {
  if (userAgentCache) return userAgentCache;
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage", "--no-sandbox", "--disable-gpu"],
  });
  try {
    const page = await browser.newPage();
    const bruto = await page.evaluate(() => navigator.userAgent);
    userAgentCache = bruto.replace("HeadlessChrome", "Chrome");
  } finally {
    await browser.close().catch(() => {});
  }
  return userAgentCache!;
}

export async function abrirWhatsapp(headless: boolean, perfil: string = PERFIL_ZAP): Promise<SessaoZap> {
  const ctx = await chromium.launchPersistentContext(perfil, {
    headless,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    viewport: { width: 1280, height: 900 },
    userAgent: await userAgentDeNavegador(),
    args: ["--disable-dev-shm-usage", "--no-sandbox", "--disable-gpu"],
  });
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.goto("https://web.whatsapp.com", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  return { ctx, page };
}

// Conectado = a lista de conversas apareceu.
async function estaConectado(page: Page): Promise<boolean> {
  for (const sel of ['div[aria-label*="Lista de conversas"]', "#pane-side", '[data-testid="chat-list"]']) {
    if ((await page.locator(sel).count()) > 0) return true;
  }
  return false;
}

async function acharQr(page: Page) {
  for (const sel of ['canvas[aria-label*="Scan"]', 'canvas[aria-label*="scan"]', "div[data-ref] canvas", "canvas"]) {
    const el = page.locator(sel).first();
    if ((await el.count()) > 0) return el;
  }
  return null;
}

/*
 * Espera a conexão. Enquanto o QR estiver na tela, tira uma foto dele e
 * entrega pelo callback — é assim que ele aparece no painel para você ler
 * com o celular, mesmo o agente rodando numa VPS sem tela.
 */
export async function aguardarConexao(
  page: Page,
  aoQr: (dataUri: string, ehTelaInteira: boolean) => Promise<void>,
  aoEstado: (estado: EstadoZap, msg?: string) => Promise<void>,
  log: (m: string) => void = () => {},
  limiteMs = 240_000,
): Promise<boolean> {
  const ate = Date.now() + limiteMs;
  let ultimo = "";
  let voltas = 0;

  while (Date.now() < ate) {
    voltas++;

    if (await estaConectado(page)) {
      await aoEstado("conectado", "WhatsApp conectado.");
      return true;
    }

    // Falha conhecida: o WhatsApp recusa o navegador. Melhor avisar na hora do
    // que ficar minutos esperando um QR que nunca vai aparecer.
    if ((await page.getByText(/funciona no Google Chrome|works on Google Chrome/i).count()) > 0) {
      const png = await page.screenshot({ timeout: 8000 }).catch(() => null);
      if (png) await aoQr(`data:image/png;base64,${png.toString("base64")}`, true);
      await aoEstado(
        "erro",
        "O WhatsApp recusou o navegador do agente. Atualize o agente na VPS (git pull + restart) e tente de novo.",
      );
      log("WhatsApp recusou o navegador — versão do agente desatualizada?");
      return false;
    }

    const qr = await acharQr(page);
    let png: Buffer | null = null;
    let telaInteira = false;

    if (qr) {
      png = await qr.screenshot({ timeout: 5000 }).catch(() => null);
    }
    // Sem canvas reconhecido, manda a tela inteira: assim você vê na hora o
    // que o WhatsApp está mostrando (QR num layout novo, aviso, erro) em vez
    // de ficar olhando para uma tela vazia.
    if (!png && voltas >= 3) {
      png = await page.screenshot({ timeout: 8000 }).catch(() => null);
      telaInteira = true;
    }

    if (png) {
      const dataUri = `data:image/png;base64,${png.toString("base64")}`;
      // O QR muda sozinho a cada ~20s; só republica quando muda de verdade.
      if (dataUri !== ultimo) {
        ultimo = dataUri;
        await aoQr(dataUri, telaInteira);
        await aoEstado(
          "aguardando_qr",
          telaInteira
            ? "Não reconheci o QR na página — abaixo está a tela do WhatsApp. Se o QR aparecer nela, pode ler assim mesmo."
            : "Leia o QR com o WhatsApp do celular.",
        );
      }
    }

    if (voltas % 5 === 0) {
      log(`aguardando leitura do QR… (${page.url().slice(0, 60)}, canvas: ${qr ? "sim" : "não"})`);
    }
    await espera(3000);
  }

  await aoEstado("erro", "Ninguém leu o QR a tempo. Clique em Conectar de novo.");
  return false;
}

export type ResultadoEnvio =
  | { ok: true }
  | { ok: false; motivo: string; semWhatsapp?: boolean; pararTudo?: boolean };

/*
 * Escuta: quais dos números que abordamos responderam?
 *
 * A leitura é pela LISTA de conversas, não abrindo cada chat: o WhatsApp
 * marca com um selo as conversas com mensagem nova, e cada linha carrega o
 * título (o número, para contato não salvo) e a prévia da última mensagem.
 * Só abrimos o chat quando o selo diz que tem novidade — abrir marca como
 * lida, e isso o lead vê (os dois tracinhos azuis), então só fazemos quando
 * vamos de fato processar a resposta.
 *
 * Seletores defensivos de propósito: o WhatsApp Web muda o DOM sem avisar.
 * Se nada casar, a função devolve vazio — nunca derruba o serviço.
 */
export type RespostaLida = { telefone: string; texto: string };

const soDigitos = (s: string) => s.replace(/\D/g, "");

// O número da conversa e o número que discamos podem diferir no nono dígito
// (o WhatsApp normaliza). Comparar pelos últimos 8 resolve os dois lados.
function mesmoNumero(a: string, b: string): boolean {
  const da = soDigitos(a);
  const db = soDigitos(b);
  return da.length >= 8 && db.length >= 8 && da.slice(-8) === db.slice(-8);
}

export async function lerRespostas(
  page: Page,
  numerosEsperados: string[],
  log: (m: string) => void = () => {},
): Promise<RespostaLida[]> {
  const saida: RespostaLida[] = [];
  if (numerosEsperados.length === 0) return saida;
  if (!(await estaConectado(page))) return saida;

  // Garante a tela inicial (a lista) — pode ter ficado num chat do envio.
  if (!page.url().includes("web.whatsapp.com")) {
    await page.goto("https://web.whatsapp.com", { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => {});
    await espera(4000);
  }

  const linhas = page.locator('#pane-side [role="listitem"], div[aria-label*="Lista de conversas"] [role="listitem"]');
  const total = Math.min(await linhas.count().catch(() => 0), 40);

  /*
   * Primeiro coleta os alvos, depois abre um a um: clicar muda a lista.
   *
   * Duas pistas dizem que o lead respondeu, e a segunda é a que faltava:
   *
   *   1. o SELO de não lida ("1 mensagem não lida");
   *   2. a última mensagem da conversa NÃO ser nossa — o WhatsApp desenha o
   *      tiquinho de entrega (✓/✓✓) na prévia só quando quem falou por
   *      último fomos nós. Sem tique, quem falou por último foi o lead.
   *
   * Só o selo não bastava: o dono vê a resposta chegar no celular, abre para
   * ler, e o selo some. A conversa continua sendo uma resposta que ninguém
   * registrou — e o lead ficava parado em "Contactado" no funil para sempre.
   */
  const alvos: string[] = [];
  for (let i = 0; i < total; i++) {
    const linha = linhas.nth(i);
    const naoLida = await linha
      .locator('[aria-label*="não lida" i], [aria-label*="unread" i]')
      .count()
      .catch(() => 0);
    // O tique da prévia: msg-check, msg-dblcheck, msg-dblcheck-ack, msg-time.
    const nossoTique = await linha
      .locator('[data-icon^="msg-"]')
      .count()
      .catch(() => 0);
    if (naoLida === 0 && nossoTique > 0) continue;

    const titulo = (await linha.locator("span[title]").first().getAttribute("title").catch(() => "")) ?? "";
    const numero = numerosEsperados.find((n) => mesmoNumero(n, titulo));
    if (numero && !alvos.includes(numero)) alvos.push(numero);
    if (alvos.length >= 5) break; // um punhado por volta chega; a próxima pega o resto
  }

  for (const numero of alvos) {
    try {
      // Abrir pelo endereço é o caminho mais estável de chegar no chat certo.
      await page.goto(`https://web.whatsapp.com/send?phone=${numero}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      const caixa = page
        .locator('div[contenteditable="true"][data-tab="10"], footer div[contenteditable="true"]')
        .first();
      const inicio = Date.now();
      while (Date.now() - inicio < 30_000 && (await caixa.count()) === 0) await espera(1200);
      if ((await caixa.count()) === 0) continue;
      await espera(1500);

      /*
       * Confere DENTRO da conversa quem falou por último. A pista da lista é
       * um palpite bom, esta é a resposta: se a última bolha é nossa, o lead
       * ainda não respondeu (ou nós já retomamos a conversa) e não há o que
       * registrar. Sem esta conferência, um número com conversa antiga viraria
       * "respondeu" por causa de uma mensagem de meses atrás.
       */
      const ultima = await page
        .locator("div.message-in, div.message-out")
        .last()
        .getAttribute("class")
        .catch(() => null);
      if (!ultima?.includes("message-in")) continue;

      // As últimas bolhas RECEBIDAS (message-in), de trás para frente até a
      // nossa última enviada — é a resposta inteira mesmo quando vem picada
      // em três mensagens curtas, como todo mundo escreve no WhatsApp.
      const textos = await page
        .locator("div.message-in span.selectable-text")
        .allInnerTexts()
        .catch(() => [] as string[]);
      /*
       * Áudio e figurinha não têm texto — e responder com áudio é resposta
       * como qualquer outra. Sem esta linha o lead respondia, o agente lia
       * vazio e o card não saía de "Contactado".
       */
      const texto = textos.slice(-3).join("\n").trim() || "(respondeu com áudio ou imagem)";
      saida.push({ telefone: numero, texto: texto.slice(0, 800) });
      log(`💬 resposta detectada de ${numero}`);
    } catch {
      // Um chat problemático não pode impedir a leitura dos outros.
    }
  }

  return saida;
}

/*
 * Foto da tela no momento da falha, em agente/diagnostico/. Devolve o nome
 * do arquivo (ou null se nem isso deu). Nunca lança: é diagnóstico.
 */
async function fotografarFalha(page: Page, telefone: string): Promise<string | null> {
  try {
    fs.mkdirSync(DIAGNOSTICO, { recursive: true });
    const nome = `envio-${telefone.replace(/\D/g, "")}-${Date.now()}.png`;
    await page.screenshot({ path: path.join(DIAGNOSTICO, nome), fullPage: false, timeout: 10_000 });
    // Só as 6 mais recentes: a pasta não pode virar um depósito.
    const antigas = fs
      .readdirSync(DIAGNOSTICO)
      .filter((f) => f.startsWith("envio-") && f.endsWith(".png"))
      .map((f) => ({ f, t: fs.statSync(path.join(DIAGNOSTICO, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t)
      .slice(6)
      .map((x) => x.f);
    for (const f of antigas) fs.rmSync(path.join(DIAGNOSTICO, f), { force: true });
    return nome;
  } catch {
    return null;
  }
}

export async function enviarMensagem(
  page: Page,
  telefone: string,
  texto: string,
): Promise<ResultadoEnvio> {
  const url = `https://web.whatsapp.com/send?phone=${telefone}&text=${encodeURIComponent(texto)}`;

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  } catch {
    return { ok: false, motivo: "A página do WhatsApp não carregou." };
  }

  /*
   * A conversa demora a montar — e cada envio recarrega o WhatsApp Web
   * inteiro, o que numa VPS ocupada passa de um minuto. Espera pela caixa de
   * texto, pelo aviso de número inválido ou por qualquer outro diálogo, o
   * que vier primeiro. O diálogo é lido pelo texto, e não por uma frase
   * fixa: o WhatsApp muda as palavras e a tela ficaria "sem abrir" à toa.
   */
  const caixa = page
    .locator('div[contenteditable="true"][data-tab="10"], footer div[contenteditable="true"]')
    .first();
  const dialogo = page.locator('div[role="dialog"]').first();
  const SEM_ZAP = /inválido|invalid|não está no WhatsApp|isn't on WhatsApp|not on WhatsApp/i;
  // "Iniciando conversa · Cancelar" é o WhatsApp procurando o número — é
  // espera, não aviso. Apertar Esc aqui cancelaria a própria conversa.
  const CARREGANDO = /iniciando conversa|starting chat|carregando|loading|sincronizando|syncing/i;

  const inicio = Date.now();
  let carregandoDesde = 0;
  while (Date.now() - inicio < 120_000) {
    if ((await dialogo.count()) > 0) {
      const texto = ((await dialogo.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
      if (SEM_ZAP.test(texto)) {
        return { ok: false, motivo: "Este número não tem WhatsApp.", semWhatsapp: true };
      }
      if (CARREGANDO.test(texto)) {
        if (!carregandoDesde) carregandoDesde = Date.now();
        /*
         * Número que existe abre em segundos. Quando o WhatsApp fica um
         * minuto inteiro em "Iniciando conversa", ele não vai avisar nada:
         * é o que ele faz com número sem WhatsApp (em vez do aviso de
         * "inválido"). Cancela e classifica como sem WhatsApp — a fila anda
         * e o número não é tentado de novo.
         */
        if (Date.now() - carregandoDesde > 60_000) {
          await fotografarFalha(page, telefone);
          await page.keyboard.press("Escape").catch(() => {});
          return {
            ok: false,
            motivo: 'O WhatsApp ficou 1 min em "Iniciando conversa" e não abriu: número sem WhatsApp.',
            semWhatsapp: true,
          };
        }
        await espera(1500);
        continue;
      }
      // Outro aviso na frente da conversa: fecha e conta o que dizia.
      if (texto) {
        await page.keyboard.press("Escape").catch(() => {});
        await espera(800);
        if ((await caixa.count()) === 0) {
          await fotografarFalha(page, telefone);
          return { ok: false, motivo: `O WhatsApp mostrou um aviso: ${texto.slice(0, 140)}` };
        }
      }
    }
    if ((await caixa.count()) > 0) break;
    if (!(await estaConectado(page)) && (await acharQr(page))) {
      return { ok: false, motivo: "A sessão do WhatsApp caiu.", pararTudo: true };
    }
    await espera(1500);
  }

  if ((await caixa.count()) === 0) {
    const foto = await fotografarFalha(page, telefone);
    const estado = carregandoDesde
      ? `preso em "Iniciando conversa" por ${Math.round((Date.now() - carregandoDesde) / 1000)}s`
      : (await estaConectado(page))
        ? "lista de conversas visível"
        : "lista de conversas ausente";
    // Se ficou no "Iniciando conversa", cancela para não deixar a tela presa
    // para a próxima mensagem.
    if (carregandoDesde) await page.keyboard.press("Escape").catch(() => {});
    return {
      ok: false,
      motivo: `A conversa não abriu em 2 min (${estado}${foto ? `; foto em agente/diagnostico/${foto}` : ""}).`,
    };
  }

  // Pausa curta antes de enviar: digitar e mandar no mesmo instante é
  // comportamento de robô.
  await espera(1200 + Math.random() * 1800);
  await caixa.click({ timeout: 10_000 }).catch(() => {});
  await page.keyboard.press("Enter");

  // Confirma que saiu: a caixa esvazia quando a mensagem é enviada.
  await espera(2500);
  const restou = (await caixa.textContent().catch(() => ""))?.trim() ?? "";
  if (restou.length > 0 && restou.length >= texto.length / 2) {
    return { ok: false, motivo: "A mensagem não saiu da caixa de texto." };
  }

  return { ok: true };
}
