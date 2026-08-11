/*
 * Captura o perfil público de uma empresa no Instagram.
 *
 * Por padrão roda anônimo, sem conta nenhuma. Isso funciona bem de conexão
 * residencial, mas de VPS (IP de datacenter) o Instagram costuma exigir login
 * já nas primeiras leituras. Para esse caso existe a sessão importada: você
 * cola em INSTAGRAM_SESSIONID o cookie de uma conta SUA que já está logada no
 * navegador. Nada de senha aqui — só o cookie, e só no .env da VPS.
 *
 * As fotos são BAIXADAS, não referenciadas: as URLs do Instagram são
 * assinadas e expiram em poucas horas: guardar o link não serviria de nada.
 */

import { chromium, type BrowserContext } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { numeroIG, type DadosIG, type StatusIG } from "../lib/prospeccao/instagram.ts";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PERFIL_IG = path.join(AQUI, ".perfil-instagram");
const MAX_FOTOS = 9;

const SESSAO = (process.env.INSTAGRAM_SESSIONID || "").trim();
const USUARIO_SESSAO = (process.env.INSTAGRAM_DS_USER_ID || "").trim();

export type ResultadoIG = { status: StatusIG; dados?: DadosIG; erro?: string };

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Dados que o Instagram embute no HTML da página, sem precisar de API.
type DadosEmbutidos = {
  nome?: string;
  bio?: string;
  seguidores?: string;
  posts?: string;
  privado?: boolean;
  fotos?: { url: string; legenda?: string }[];
};

export async function capturarInstagram(
  usuario: string,
  headless: boolean,
  log: (m: string) => void = () => {},
): Promise<ResultadoIG> {
  let ctx: BrowserContext | undefined;

  try {
    ctx = await chromium.launchPersistentContext(PERFIL_IG, {
      headless,
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      viewport: { width: 1280, height: 900 },
      args: ["--disable-dev-shm-usage", "--no-sandbox", "--disable-gpu"],
    });
    // Sessão importada: entra como a sua conta, sem passar senha para o robô.
    if (SESSAO) {
      await ctx.addCookies([
        {
          name: "sessionid",
          value: SESSAO,
          domain: ".instagram.com",
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        },
        ...(USUARIO_SESSAO
          ? [
              {
                name: "ds_user_id",
                value: USUARIO_SESSAO,
                domain: ".instagram.com",
                path: "/",
                secure: true,
                sameSite: "Lax" as const,
              },
            ]
          : []),
      ]);
      log("usando a sessão do .env");
    }

    const page = ctx.pages()[0] ?? (await ctx.newPage());

    const resposta = await page.goto(`https://www.instagram.com/${usuario}/`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });

    if (resposta && resposta.status() === 404) {
      return { status: "nao_encontrado", erro: "Este perfil não existe mais." };
    }

    await espera(3000); // o conteúdo do perfil monta por JavaScript

    const url = page.url();
    if (url.includes("/accounts/login") || url.includes("challenge")) {
      return {
        status: "bloqueado",
        erro: SESSAO
          ? "O Instagram recusou a sessão salva (o cookie expirou ou a conta caiu em verificação). Gere um INSTAGRAM_SESSIONID novo no agente/.env."
          : "O Instagram exigiu login para ver este perfil. Isso é comum quando o agente roda em VPS. Configure INSTAGRAM_SESSIONID no agente/.env para ler com uma conta sua.",
      };
    }

    const corpo = (await page.textContent("body").catch(() => "")) ?? "";
    if (/Esta conta é privada|This Account is Private/i.test(corpo)) {
      return { status: "privado", erro: "O perfil é privado — não dá para ver as fotos." };
    }
    if (/Página não disponível|Sorry, this page isn't available/i.test(corpo)) {
      return { status: "nao_encontrado", erro: "Perfil não encontrado." };
    }

    /*
     * A leitura vem da meta description, que o Instagram preenche mesmo sem
     * login e no formato "1.234 seguidores, 56 seguindo, 78 publicações -
     * Nome (@user) no Instagram: "bio"". É bem mais estável que caçar
     * elementos, porque as classes deles mudam toda semana.
     */
    const embutido = await page.evaluate((): DadosEmbutidos => {
      const meta = document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
      const og = document.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? "";

      const seguidores = /([\d.,]+\s*(?:mil|milhões|milhão|mi|M|K)?)\s*(?:seguidores|Followers)/i.exec(meta)?.[1];
      const posts = /([\d.,]+\s*(?:mil|milhões|milhão|mi|M|K)?)\s*(?:publicaç|posts)/i.exec(meta)?.[1];
      const bio = /:\s*"([\s\S]*?)"\s*$/.exec(meta)?.[1];
      const nome = og.split("(@")[0].trim() || undefined;

      // Fotos do feed: as imagens da grade têm alt preenchido pelo Instagram.
      const fotos: { url: string; legenda?: string }[] = [];
      for (const img of Array.from(document.querySelectorAll("main img, article img"))) {
        const el = img as HTMLImageElement;
        const src = el.currentSrc || el.src;
        if (!src || !src.startsWith("http")) continue;
        if (el.naturalWidth > 0 && el.naturalWidth < 150) continue; // ícones
        fotos.push({ url: src, legenda: el.alt || undefined });
      }

      return { nome, bio, seguidores, posts, fotos };
    });

    const fotos = (embutido.fotos ?? []).slice(0, MAX_FOTOS + 1);
    log(
      `perfil lido: ${embutido.nome ?? usuario} · ${fotos.length} imagens · ${embutido.seguidores ?? "?"} seguidores`,
    );

    return {
      status: "ok",
      dados: {
        nome: embutido.nome,
        bio: embutido.bio?.trim() || undefined,
        seguidores: numeroIG(embutido.seguidores),
        posts: numeroIG(embutido.posts),
        fotos,
      },
    };
  } catch (e) {
    return { status: "erro", erro: (e as Error).message.slice(0, 200) };
  } finally {
    await ctx?.close().catch(() => {});
  }
}

// Baixa a imagem do Instagram. Os links expiram, então isto precisa acontecer
// na hora da captura, não depois.
export async function baixarFoto(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Referer: "https://www.instagram.com/" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    // Menos de 8KB costuma ser ícone ou imagem de erro.
    return buf.byteLength > 8_000 ? buf : null;
  } catch {
    return null;
  }
}
