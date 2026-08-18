import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { responderPagina, CSP_PAGINA_CLIENTE, type SiteServivel } from "@/lib/ia/servir";

/*
 * O link único do Fechador: /p/<codigo>.
 *
 * Serve a MESMA página que o endereço interno — a diferença é que aqui cada
 * visita conta para o Termômetro daquele lead específico. Só ele recebeu
 * este endereço, então toda abertura é dele (ou de alguém para quem ele
 * mostrou — notícia ainda melhor).
 *
 * Três visitas que NÃO contam, na ordem em que aparecem:
 *
 * 1. O robô de prévia. Quando um link é mandado no WhatsApp, os servidores
 *    da Meta abrem a página para montar o cartãozinho — sem este filtro,
 *    TODO lead apareceria como "abriu imediatamente", que é exatamente a
 *    informação errada que o Termômetro existe para evitar.
 * 2. O dono logado conferindo o próprio envio.
 * 3. Recarga: aberturas em sequência dentro de 30 minutos são UMA visita.
 *    Três aberturas espaçadas no dia é que são sinal de calor.
 */

const ROBOS =
  /whatsapp|facebookexternalhit|facebot|telegrambot|twitterbot|slackbot|linkedinbot|discordbot|skypeuripreview|googlebot|bingbot|preview|bot\b|crawler|spider/i;

const JANELA_RECARGA_MS = 30 * 60_000;

export async function GET(req: Request, ctx: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await ctx.params;
  if (!/^[a-z0-9]{6,24}$/i.test(codigo)) {
    return new Response("Não encontrado", { status: 404 });
  }

  const admin = createAdminClient();
  const { data: pRaw } = await admin
    .from("prospeccao")
    .select("id, org_id, site_ia_id")
    .eq("link_codigo", codigo)
    .maybeSingle();
  const prospecto = pRaw as { id: string; org_id: string; site_ia_id: string | null } | null;
  if (!prospecto?.site_ia_id) return new Response("Não encontrado", { status: 404 });

  const { data: sRaw } = await admin
    .from("sites_ia")
    .select("id, org_id, html, publicado, facebook_pixel_id, codigo_head")
    .eq("id", prospecto.site_ia_id)
    .maybeSingle();
  const site = sRaw as SiteServivel | null;
  if (!site?.html) return new Response("Não encontrado", { status: 404 });

  // A medição roda por fora da resposta: falhar aqui não pode atrasar nem
  // derrubar a página na mão do lead.
  try {
    const ua = req.headers.get("user-agent") ?? "";
    const ehRobo = ROBOS.test(ua);

    let ehDono = false;
    if (!ehRobo) {
      // Dono logado no painel abrindo o próprio link: visita interna.
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      ehDono = !!user;
    }

    if (!ehRobo && !ehDono) {
      const { data: ultimaRaw } = await admin
        .from("prospeccao_aberturas")
        .select("created_at")
        .eq("prospecto_id", prospecto.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const ultima = (ultimaRaw as { created_at: string } | null)?.created_at;
      const recarga = !!ultima && Date.now() - new Date(ultima).getTime() < JANELA_RECARGA_MS;

      if (!recarga) {
        await admin.from("prospeccao_aberturas").insert({
          org_id: prospecto.org_id,
          prospecto_id: prospecto.id,
          navegador: ua.slice(0, 120) || null,
        });
      }
    }
  } catch (e) {
    console.error("[termometro]", (e as Error).message);
  }

  // A página em si — a mesma montagem (métricas, pixel) do endereço interno,
  // mas SEM cache: o Termômetro precisa ver cada visita chegar ao servidor.
  const resposta = await responderPagina(site);
  const headers = new Headers(resposta.headers);
  headers.set("Cache-Control", "no-store");
  // O lead pode encaminhar o link; o Google não precisa indexar uma prévia.
  headers.set("X-Robots-Tag", "noindex");
  // HTML de cliente no nosso domínio roda enjaulado — ver CSP_PAGINA_CLIENTE.
  headers.set("Content-Security-Policy", CSP_PAGINA_CLIENTE);
  return new Response(resposta.body, { status: resposta.status, headers });
}
