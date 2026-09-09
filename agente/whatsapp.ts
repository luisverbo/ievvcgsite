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
  | {
      ok: false;
      motivo: string;
      semWhatsapp?: boolean;
      pararTudo?: boolean;
      /* Foto da tela na hora da falha (data URI), para o painel mostrar. */
      foto?: string;
      /* Falha de abertura, não do número: vale tentar de novo mais tarde. */
      tentarDeNovo?: boolean;
      /* O WhatsApp restringiu a conta nos dispositivos conectados: não abre conversas novas. */
      restringida?: boolean;
    };

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

/*
 * Por onde o rodízio parou.
 *
 * A varredura da lista só identifica a conversa quando o título traz o
 * número — e conta comercial mostra o NOME da empresa. Para esses (e para
 * quem ficou fora das 40 primeiras conversas) existe o rodízio: algumas por
 * volta, abrindo a conversa direto pelo número, até todos terem sido
 * conferidos. Devagar de propósito: escutar é trabalho de fundo.
 */
let rodizio = 0;

export async function lerRespostas(
  page: Page,
  numerosEsperados: string[],
  log: (m: string) => void = () => {},
  opcoes: OpcoesEnvio & { porVolta?: number } = {},
): Promise<RespostaLida[]> {
  const saida: RespostaLida[] = [];
  if (numerosEsperados.length === 0) return saida;
  if (!(await estaConectado(page))) {
    log("escuta: o WhatsApp ainda não mostrou a lista de conversas");
    return saida;
  }
  const porVolta = Math.max(1, opcoes.porVolta ?? 5);

  // Garante a tela inicial (a lista) — pode ter ficado num chat do envio.
  if (!page.url().includes("web.whatsapp.com")) {
    await page
      .goto(`${opcoes.base ?? "https://web.whatsapp.com"}`, { waitUntil: "domcontentloaded", timeout: 60_000 })
      .catch(() => {});
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
  // Conversas cujo título não casou com número nenhum — vai para o log.
  const semNumero: string[] = [];
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

    /*
     * O número da conversa. `span[title]` costuma trazer o nome/telefone da
     * linha, mas conta comercial mostra o NOME da empresa — e aí não há
     * dígito nenhum para casar. Por isso olhamos todos os títulos da linha,
     * e não só o primeiro: em algum deles costuma vir o número.
     */
    const titulos = (await linha.locator("[title]").evaluateAll(
      (els) => els.map((e) => e.getAttribute("title") ?? ""),
    ).catch(() => [] as string[]));
    const numero = numerosEsperados.find((n) => titulos.some((t) => mesmoNumero(n, t)));
    if (numero && !alvos.includes(numero)) alvos.push(numero);
    else if (!numero) semNumero.push((titulos[0] ?? "").slice(0, 24));
    if (alvos.length >= porVolta) break; // o resto fica para a próxima volta
  }

  /*
   * O diagnóstico da escuta, no log da VPS. Sem isto, "não registrou
   * resposta nenhuma" é indistinguível de "ninguém respondeu" — e foi
   * exatamente nisso que se perdeu tempo: o envio funcionando ao lado e a
   * escuta desistindo calada.
   */
  /*
   * O rodízio preenche o que sobrou da cota da volta. Sem ele, um lead com
   * conta comercial (nome no lugar do número na lista) nunca seria
   * conferido — e foi assim que respostas de verdade passaram batido.
   */
  const porRodizio: string[] = [];
  if (alvos.length < porVolta && numerosEsperados.length > 0) {
    for (let k = 0; k < numerosEsperados.length && alvos.length + porRodizio.length < porVolta; k++) {
      const n = numerosEsperados[(rodizio + k) % numerosEsperados.length];
      if (!alvos.includes(n) && !porRodizio.includes(n)) porRodizio.push(n);
    }
    rodizio = (rodizio + porRodizio.length) % Math.max(1, numerosEsperados.length);
  }

  log(
    `escuta: ${numerosEsperados.length} aguardando · ${total} conversas na lista · ` +
      `${alvos.length} pela lista + ${porRodizio.length} por rodízio` +
      (semNumero.length > 0 ? ` · sem número na lista: ${semNumero.slice(0, 3).join(", ")}` : ""),
  );

  for (const numero of [...alvos, ...porRodizio]) {
    try {
      /*
       * A MESMA abertura do envio. Antes daqui saía um goto com 30 segundos
       * de espera e um `continue` calado: numa VPS em que a conversa leva um
       * minuto para montar, a escuta desistia de todas as vezes — envio
       * funcionando, resposta nunca registrada, e nada no log.
       */
      /*
       * Teto maior que o do envio de propósito. Aqui desistir cedo custa uma
       * RESPOSTA perdida — e ninguém está esperando na fila atrás. Foi um
       * teto curto (30s, calado) que segurou a escuta inteira nesta VPS.
       */
      const aberta = await abrirConversa(page, numero, {
        esperaAberturaMs: 90_000,
        esperaSilencioMs: 45_000,
        ...opcoes,
      });
      if (!aberta.ok) {
        log(`escuta: não abri a conversa de ${numero} (${aberta.motivo.slice(0, 80)})`);
        continue;
      }
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
 * Foto da tela no momento da falha: vai para agente/diagnostico/ (as 6 mais
 * recentes) e volta como data URI para o painel mostrar. Nunca lança.
 */
async function fotografarFalha(page: Page, telefone: string): Promise<{ nome: string | null; dataUri: string | null }> {
  let dataUri: string | null = null;
  let nome: string | null = null;
  try {
    const jpeg = await page.screenshot({ type: "jpeg", quality: 55, fullPage: false, timeout: 10_000 });
    dataUri = `data:image/jpeg;base64,${jpeg.toString("base64")}`;
    fs.mkdirSync(DIAGNOSTICO, { recursive: true });
    nome = `envio-${telefone.replace(/\D/g, "")}-${Date.now()}.jpg`;
    fs.writeFileSync(path.join(DIAGNOSTICO, nome), jpeg);
    const antigas = fs
      .readdirSync(DIAGNOSTICO)
      .filter((f) => f.startsWith("envio-"))
      .map((f) => ({ f, t: fs.statSync(path.join(DIAGNOSTICO, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t)
      .slice(6)
      .map((x) => x.f);
    for (const f of antigas) fs.rmSync(path.join(DIAGNOSTICO, f), { force: true });
  } catch {
    /* diagnóstico é bônus */
  }
  return { nome, dataUri };
}

/*
 * A caixa de texto da conversa. Três formas porque o WhatsApp Web troca o
 * DOM sem avisar: o rodapé da conversa, a aba 10 (a caixa de mensagem, ao
 * contrário da busca, que é a 3) e o textbox dentro do painel principal.
 */
export const SELETOR_CAIXA = [
  '#main [contenteditable="true"]',
  '[role="main"] [contenteditable="true"]',
  'footer div[contenteditable="true"]',
  'div[contenteditable="true"][data-tab="10"]',
  '[contenteditable="true"][aria-placeholder]',
].join(", ");

// O painel da conversa (cabeçalho com o número, mensagens, rodapé).
const SELETOR_CONVERSA = '#main, [role="main"]';

/*
 * O que existe no painel da conversa, em uma linha: cada elemento editável
 * (com papel, aba, rótulo e onde está) e os botões. É o que diz, sem foto,
 * por que a caixa de texto não foi encontrada.
 */
async function descreverConversa(page: Page): Promise<string> {
  try {
    return await page.evaluate((sel) => {
      const main = document.querySelector(sel);
      if (!main) return "sem painel de conversa";
      const ed = [...document.querySelectorAll('[contenteditable="true"]')].map((e) => {
        const el = e as HTMLElement;
        const pai = el.closest("footer") ? "footer" : el.closest("#main, [role=main]") ? "main" : el.closest("#side") ? "side" : "?";
        return `${el.tagName.toLowerCase()} role=${el.getAttribute("role") ?? "-"} tab=${el.getAttribute("data-tab") ?? "-"} rotulo="${(
          el.getAttribute("aria-label") ??
          el.getAttribute("aria-placeholder") ??
          el.getAttribute("title") ??
          ""
        ).slice(0, 30)}" em=${pai}`;
      });
      const botoes = [...main.querySelectorAll("button, [role=button]")]
        .map((b) => ((b as HTMLElement).innerText || b.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, 8);
      return `rodapé=${main.querySelector("footer") ? "sim" : "não"}; editáveis=[${ed.join(" | ") || "nenhum"}]; botões=[${botoes.join(" | ")}]`;
    }, SELETOR_CONVERSA);
  } catch {
    return "não deu para ler o painel";
  }
}

// Aviso de número sem WhatsApp, em português e inglês.
const SEM_ZAP = /inválido|invalid|não está no WhatsApp|isn't on WhatsApp|not on WhatsApp/i;
// "Iniciando conversa · Cancelar": o WhatsApp procurando o número. É espera.
const CARREGANDO = /iniciando conversa|starting chat|carregando|loading|sincronizando|syncing/i;
/*
 * A restrição: o WhatsApp bloqueia a conta de ABRIR conversas novas pelos
 * dispositivos conectados (o WhatsApp Web), e escreve isto no lugar da caixa
 * de texto. Conversas já existentes seguem funcionando — por isso o teste
 * para o próprio número passa e todos os números novos falham.
 */
const RESTRICAO =
  /restringida dos dispositivos|não é possível iniciar novas conversas|restricted from linked devices|can't start new chats|cannot start new chats|unable to start new chats/i;

// Faixa no topo da lista quando o WhatsApp Web está sem ligação com o celular.
const SEM_LIGACAO =
  /computador não conectado|tentando conectar|conectando|phone not connected|trying to reach|connecting|sem conexão/i;

export type OpcoesEnvio = {
  /* Origem do WhatsApp Web. O teste aponta para um servidor local. */
  base?: string;
  /* Teto total para a conversa abrir, por tentativa. */
  esperaAberturaMs?: number;
  /* Preso em "Iniciando conversa" por mais que isto: tenta abrir de novo. */
  esperaIniciandoMs?: number;
  /* App pronto, sem diálogo e sem conversa por mais que isto: tenta de novo. */
  esperaSilencioMs?: number;
  /* Quantas vezes navegar até a conversa antes de desistir. */
  tentativas?: number;
  /* Pausa humana antes do Enter, [mín, máx]. */
  pausaAntesMs?: [number, number];
  /* Quanto esperar a caixa esvaziar depois do Enter. */
  confirmacaoMs?: number;
  log?: (m: string) => void;
};

/*
 * Abre a conversa pelo endereço e manda o texto.
 *
 * O que aprendemos na prática, e este código carrega:
 *
 *   - Cada envio recarrega o WhatsApp Web inteiro. A lista aparece do cache
 *     ANTES da ligação com o servidor voltar; se a busca do número roda nessa
 *     janela, ela fica presa em "Iniciando conversa" ou some sem abrir nada —
 *     e o número tinha WhatsApp. Por isso: preso ou em silêncio, navegamos
 *     de novo (uma segunda carga é rápida, com tudo em cache).
 *   - "Iniciando conversa" NÃO é aviso: apertar Esc nela cancela a conversa.
 *   - O aviso de número inválido é lido pelo texto do diálogo, não por um
 *     seletor: o WhatsApp muda as classes toda semana, as palavras não.
 *   - Na falha final, foto da tela e o texto do painel principal vão no
 *     motivo — numa VPS sem monitor é a única forma de ver o que houve.
 */
/*
 * Abre a conversa de um número e espera a caixa de texto aparecer.
 *
 * Extraída do envio porque a ESCUTA precisa exatamente da mesma coisa —
 * e não tinha: ela dava 30 segundos e desistia calada. Numa VPS onde a
 * conversa leva um minuto para montar, isso significava nunca registrar
 * resposta nenhuma, com o envio funcionando ao lado. Uma função só para
 * "abrir conversa" é o que impede os dois caminhos de divergirem de novo.
 *
 * O que ela carrega, aprendido na prática:
 *
 *   - cada goto recarrega o WhatsApp Web inteiro, e a lista aparece do
 *     cache ANTES de a ligação com o celular voltar; se a busca do número
 *     roda nessa janela, fica presa em "Iniciando conversa" ou some sem
 *     abrir nada. Por isso: preso ou em silêncio, navega de novo;
 *   - "Iniciando conversa" NÃO é aviso: Esc ali cancela a conversa;
 *   - número inválido e conta restringida são lidos pelo TEXTO do
 *     diálogo, não por seletor: o WhatsApp muda classe toda semana, as
 *     palavras não.
 */
export async function abrirConversa(
  page: Page,
  telefone: string,
  opcoes: OpcoesEnvio & { texto?: string } = {},
): Promise<{ ok: true } | (ResultadoEnvio & { ok: false })> {
  const base = opcoes.base ?? "https://web.whatsapp.com";
  const esperaAbertura = opcoes.esperaAberturaMs ?? 120_000;
  const esperaIniciando = opcoes.esperaIniciandoMs ?? 60_000;
  const esperaSilencio = opcoes.esperaSilencioMs ?? 25_000;
  const tentativas = Math.max(1, opcoes.tentativas ?? 2);
  const log = opcoes.log ?? (() => {});
  const passo = Math.min(1500, Math.max(100, Math.floor(esperaSilencio / 5)));

  // Com texto, a caixa já vem preenchida (envio). Sem texto, só abre (escuta).
  const url =
    `${base}/send/?phone=${telefone}` +
    (opcoes.texto ? `&text=${encodeURIComponent(opcoes.texto)}` : "") +
    "&type=phone_number&app_absent=0";
  const caixa = page.locator(SELETOR_CAIXA).first();
  const dialogo = page.locator('div[role="dialog"]').first();

  let diagnostico = "";
  let abriu = false;

  for (let tentativa = 1; tentativa <= tentativas && !abriu; tentativa++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    } catch {
      if (tentativa < tentativas) continue;
      return { ok: false, motivo: "A página do WhatsApp não carregou.", tentarDeNovo: true };
    }

    const inicio = Date.now();
    let prontoEm = 0;
    let carregandoDesde = 0;
    let semLigacaoVisto = false;
    let conversaDesde = 0;
    let tentouBotao = false;
    diagnostico = "";

    while (Date.now() - inicio < esperaAbertura) {
      if ((await caixa.count()) > 0) {
        abriu = true;
        break;
      }

      if ((await dialogo.count()) > 0) {
        const textoDialogo = ((await dialogo.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
        if (SEM_ZAP.test(textoDialogo)) {
          return { ok: false, motivo: "Este número não tem WhatsApp.", semWhatsapp: true };
        }
        if (CARREGANDO.test(textoDialogo)) {
          if (!carregandoDesde) carregandoDesde = Date.now();
          if (Date.now() - carregandoDesde > esperaIniciando) {
            diagnostico = `preso em "Iniciando conversa" por ${Math.round((Date.now() - carregandoDesde) / 1000)}s`;
            await page.keyboard.press("Escape").catch(() => {});
            break; // tenta de novo
          }
          await espera(passo);
          continue;
        }
        if (textoDialogo) {
          // Outro aviso na frente da conversa: fecha e conta o que dizia.
          await page.keyboard.press("Escape").catch(() => {});
          await espera(Math.min(800, passo));
          if ((await caixa.count()) > 0) {
            abriu = true;
            break;
          }
          const { dataUri } = await fotografarFalha(page, telefone);
          return {
            ok: false,
            motivo: `O WhatsApp mostrou um aviso: ${textoDialogo.slice(0, 140)}`,
            foto: dataUri ?? undefined,
            tentarDeNovo: true,
          };
        }
      } else {
        carregandoDesde = 0;
      }

      if (!(await estaConectado(page))) {
        if (await acharQr(page)) {
          return { ok: false, motivo: "A sessão do WhatsApp caiu.", pararTudo: true };
        }
        await espera(passo); // ainda carregando o app
        continue;
      }
      if (!prontoEm) prontoEm = Date.now();

      // Sem ligação com o celular: a busca do número não anda. Não conta
      // como silêncio — é espera.
      const semLigacao = (await page.locator("#side, #app").getByText(SEM_LIGACAO).count().catch(() => 0)) > 0;
      if (semLigacao) {
        semLigacaoVisto = true;
        prontoEm = Date.now();
        await espera(passo);
        continue;
      }

      /*
       * A conversa ABRIU (cabeçalho com o número) mas a caixa ainda não veio:
       * isto é progresso, não silêncio — recarregar aqui jogaria fora uma
       * conversa quase pronta. Espera o teto inteiro. E se houver um botão
       * pedindo confirmação para conversar com número desconhecido, clica.
       */
      const conversa = page.locator(SELETOR_CONVERSA).first();
      const textoConversa = ((await conversa.innerText().catch(() => "")) ?? "").trim();
      if (textoConversa.length > 0) {
        if (RESTRICAO.test(textoConversa)) {
          const { dataUri } = await fotografarFalha(page, telefone);
          const frase = textoConversa.replace(/\s+/g, " ").match(/[^.]*restringid[^.]*\.?[^.]*\.?/i)?.[0]?.trim();
          return {
            ok: false,
            motivo: `O WhatsApp restringiu esta conta nos dispositivos conectados: não abre conversas novas por enquanto${
              frase ? ` (texto do WhatsApp: "${frase.slice(0, 160)}")` : ""
            }.`,
            pararTudo: true,
            restringida: true,
            foto: dataUri ?? undefined,
          };
        }
        if (!conversaDesde) conversaDesde = Date.now();
        if (!tentouBotao && Date.now() - conversaDesde > Math.min(5000, esperaSilencio)) {
          tentouBotao = true;
          const botao = conversa
            .locator("button, [role=button]")
            .filter({ hasText: /continuar|iniciar conversa|enviar mensagem|conversar|^ok$|^sim/i })
            .first();
          if ((await botao.count().catch(() => 0)) > 0) {
            log(`${telefone}: a conversa abriu com um botão na frente — clicando`);
            await botao.click({ timeout: 5000 }).catch(() => {});
          }
        }
        await espera(passo);
        continue;
      }

      if (Date.now() - prontoEm > esperaSilencio) {
        diagnostico = `lista visível e nada aconteceu em ${Math.round((Date.now() - prontoEm) / 1000)}s${
          semLigacaoVisto ? " (o WhatsApp esteve sem ligação com o celular)" : ""
        }`;
        break; // tenta de novo
      }
      await espera(passo);
    }

    if (!abriu && !diagnostico && conversaDesde) {
      diagnostico = `a conversa abriu mas a caixa de texto não apareceu em ${Math.round((Date.now() - conversaDesde) / 1000)}s`;
    }

    if (!abriu && !diagnostico) diagnostico = `a conversa não abriu em ${Math.round(esperaAbertura / 1000)}s`;
    if (!abriu && tentativa < tentativas) log(`${telefone}: ${diagnostico} — abrindo de novo`);
  }

  if (!abriu) {
    const { nome, dataUri } = await fotografarFalha(page, telefone);
    const painel = ((await page.locator(SELETOR_CONVERSA).first().innerText().catch(() => "")) ?? "")
      .replace(/\s+/g, " ")
      .trim();
    const partes = [
      diagnostico,
      painel ? `painel: "${painel.slice(0, 80)}"` : "",
      painel ? await descreverConversa(page) : "",
      nome ? `foto: ${nome}` : "",
    ].filter(Boolean);
    return {
      ok: false,
      motivo: `A conversa não abriu (${partes.join("; ")}).`,
      foto: dataUri ?? undefined,
      tentarDeNovo: true,
    };
  }

  return { ok: true };
}

/*
 * Abre a conversa e manda o texto. O trabalho de ABRIR mora em
 * abrirConversa (a mesma que a escuta usa); aqui fica o que é do envio:
 * a pausa humana antes do Enter e a confirmação de que a mensagem saiu.
 */
export async function enviarMensagem(
  page: Page,
  telefone: string,
  texto: string,
  opcoes: OpcoesEnvio = {},
): Promise<ResultadoEnvio> {
  const [pausaMin, pausaMax] = opcoes.pausaAntesMs ?? [1200, 3000];
  const confirmacao = opcoes.confirmacaoMs ?? 2500;
  const caixa = page.locator(SELETOR_CAIXA).first();

  const aberta = await abrirConversa(page, telefone, { ...opcoes, texto });
  if (!aberta.ok) return aberta;

  // Pausa curta antes de enviar: digitar e mandar no mesmo instante é
  // comportamento de robô.
  await espera(pausaMin + Math.random() * Math.max(0, pausaMax - pausaMin));
  await caixa.click({ timeout: 10_000 }).catch(() => {});
  await page.keyboard.press("Enter");

  // Confirma que saiu: a caixa esvazia quando a mensagem é enviada. Se não
  // esvaziou, tenta o botão de enviar antes de dar por perdido.
  await espera(confirmacao);
  const sobrou = async () => {
    const restou = (await caixa.textContent().catch(() => ""))?.trim() ?? "";
    return restou.length > 0 && restou.length >= texto.length / 2;
  };
  if (await sobrou()) {
    const botao = page
      .locator('button[aria-label*="Enviar" i], button[aria-label*="Send" i], [data-icon="send"], [data-icon="wds-ic-send-filled"]')
      .first();
    if ((await botao.count()) > 0) {
      await botao.click({ timeout: 5_000 }).catch(() => {});
      await espera(confirmacao);
    }
    if (await sobrou()) {
      const { dataUri } = await fotografarFalha(page, telefone);
      return { ok: false, motivo: "A mensagem não saiu da caixa de texto.", foto: dataUri ?? undefined, tentarDeNovo: true };
    }
  }

  return { ok: true };
}

/*
 * Manda num GRUPO, pelo nome — o aquecimento entre as linhas da conta, quando
 * o dono criou um grupo com todas. Sem endereço por URL: abre o grupo pela
 * lista de conversas (ou pela busca), digita e manda.
 */
export async function enviarNoGrupo(
  page: Page,
  nomeGrupo: string,
  texto: string,
  opcoes: Pick<OpcoesEnvio, "log" | "pausaAntesMs" | "confirmacaoMs" | "esperaAberturaMs"> = {},
): Promise<ResultadoEnvio> {
  const log = opcoes.log ?? (() => {});
  const [pausaMin, pausaMax] = opcoes.pausaAntesMs ?? [1200, 3000];
  const confirmacao = opcoes.confirmacaoMs ?? 2500;
  const teto = opcoes.esperaAberturaMs ?? 60_000;
  const nome = nomeGrupo.trim();

  if (!(await estaConectado(page))) {
    if (await acharQr(page)) return { ok: false, motivo: "A sessão do WhatsApp caiu.", pararTudo: true };
    return { ok: false, motivo: "O WhatsApp ainda não carregou a lista de conversas.", tentarDeNovo: true };
  }

  // 1) Na lista de conversas, pelo título exato.
  const naLista = page.locator(`#pane-side span[title="${nome.replace(/"/g, '\\"')}"]`).first();
  if ((await naLista.count()) > 0) {
    await naLista.click({ timeout: 10_000 }).catch(() => {});
  } else {
    // 2) Pela busca: digita o nome e clica no resultado com esse título.
    const busca = page
      .locator('#side [contenteditable="true"][data-tab="3"], #side div[role="textbox"][contenteditable="true"]')
      .first();
    if ((await busca.count()) === 0) {
      return { ok: false, motivo: `Não achei o grupo "${nome}" na lista nem a busca do WhatsApp.`, tentarDeNovo: true };
    }
    await busca.click({ timeout: 5000 }).catch(() => {});
    await page.keyboard.press("Control+A").catch(() => {});
    await page.keyboard.type(nome, { delay: 40 });
    await espera(2500);
    const resultado = page.locator(`#side span[title="${nome.replace(/"/g, '\\"')}"]`).first();
    if ((await resultado.count()) === 0) {
      await page.keyboard.press("Escape").catch(() => {});
      return {
        ok: false,
        motivo: `O grupo "${nome}" não apareceu na busca. Confira o nome exato no celular desta linha.`,
      };
    }
    await resultado.click({ timeout: 10_000 }).catch(() => {});
  }

  // A caixa da conversa: espera aparecer, como no envio comum.
  const caixa = page.locator(SELETOR_CAIXA).first();
  const inicio = Date.now();
  while (Date.now() - inicio < teto && (await caixa.count()) === 0) await espera(800);
  if ((await caixa.count()) === 0) {
    const { dataUri } = await fotografarFalha(page, `grupo-${nome}`);
    return { ok: false, motivo: `Abri "${nome}" mas a caixa de texto não apareceu.`, foto: dataUri ?? undefined, tentarDeNovo: true };
  }

  // Confere que é o grupo certo: o cabeçalho da conversa traz o nome.
  const cabecalho = ((await page.locator(`${SELETOR_CONVERSA} header`).first().innerText().catch(() => "")) ?? "").trim();
  if (cabecalho && !cabecalho.toLowerCase().includes(nome.toLowerCase())) {
    return { ok: false, motivo: `Abriu outra conversa ("${cabecalho.slice(0, 40)}") em vez do grupo "${nome}".` };
  }

  await espera(pausaMin + Math.random() * Math.max(0, pausaMax - pausaMin));
  await caixa.click({ timeout: 10_000 }).catch(() => {});
  await page.keyboard.type(texto, { delay: 30 + Math.random() * 50 });
  await espera(300);
  await page.keyboard.press("Enter");

  await espera(confirmacao);
  const restou = (await caixa.textContent().catch(() => ""))?.trim() ?? "";
  if (restou.length > 0 && restou.length >= texto.length / 2) {
    const botao = page.locator('button[aria-label*="Enviar" i], button[aria-label*="Send" i], [data-icon="send"]').first();
    if ((await botao.count()) > 0) {
      await botao.click({ timeout: 5000 }).catch(() => {});
      await espera(confirmacao);
    }
    const ainda = (await caixa.textContent().catch(() => ""))?.trim() ?? "";
    if (ainda.length > 0 && ainda.length >= texto.length / 2) {
      return { ok: false, motivo: "A mensagem não saiu da caixa de texto do grupo.", tentarDeNovo: true };
    }
  }
  log(`grupo "${nome}": mensagem enviada`);
  return { ok: true };
}
