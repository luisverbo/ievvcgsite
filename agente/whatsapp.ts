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
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PERFIL_ZAP = path.join(AQUI, ".perfil-whatsapp");

export type EstadoZap = "desconectado" | "aguardando_qr" | "conectado" | "erro";

export type SessaoZap = {
  ctx: BrowserContext;
  page: Page;
};

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function abrirWhatsapp(headless: boolean): Promise<SessaoZap> {
  const ctx = await chromium.launchPersistentContext(PERFIL_ZAP, {
    headless,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    viewport: { width: 1280, height: 900 },
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
  aoQr: (dataUri: string) => Promise<void>,
  aoEstado: (estado: EstadoZap, msg?: string) => Promise<void>,
  limiteMs = 180_000,
): Promise<boolean> {
  const ate = Date.now() + limiteMs;
  let ultimoQr = "";

  while (Date.now() < ate) {
    if (await estaConectado(page)) {
      await aoEstado("conectado", "WhatsApp conectado.");
      return true;
    }

    const qr = await acharQr(page);
    if (qr) {
      try {
        const png = await qr.screenshot({ timeout: 5000 });
        const dataUri = `data:image/png;base64,${png.toString("base64")}`;
        // O QR do WhatsApp muda sozinho a cada ~20s; só reenvia se mudou.
        if (dataUri !== ultimoQr) {
          ultimoQr = dataUri;
          await aoQr(dataUri);
          await aoEstado("aguardando_qr", "Leia o QR com o WhatsApp do celular.");
        }
      } catch {
        /* o QR sumiu enquanto tirávamos a foto: tenta de novo na próxima volta */
      }
    }

    await espera(3000);
  }

  await aoEstado("erro", "Ninguém leu o QR a tempo. Peça a reconexão e tente de novo.");
  return false;
}

export type ResultadoEnvio =
  | { ok: true }
  | { ok: false; motivo: string; semWhatsapp?: boolean; pararTudo?: boolean };

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

  // A conversa demora a montar; espera pela caixa de texto ou pelo aviso de
  // número inválido, o que vier primeiro.
  const caixa = page
    .locator('div[contenteditable="true"][data-tab="10"], footer div[contenteditable="true"]')
    .first();
  const invalido = page.getByText(/inválido|invalid|não está no WhatsApp|isn't on WhatsApp/i).first();

  const inicio = Date.now();
  while (Date.now() - inicio < 45_000) {
    if ((await invalido.count()) > 0) {
      return { ok: false, motivo: "Este número não tem WhatsApp.", semWhatsapp: true };
    }
    if ((await caixa.count()) > 0) break;
    if (!(await estaConectado(page)) && (await acharQr(page))) {
      return { ok: false, motivo: "A sessão do WhatsApp caiu.", pararTudo: true };
    }
    await espera(1500);
  }

  if ((await caixa.count()) === 0) {
    return { ok: false, motivo: "A conversa não abriu a tempo." };
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
