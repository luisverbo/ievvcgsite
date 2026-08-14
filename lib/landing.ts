import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/*
 * O vídeo de vendas da landing page — opcional, controlado pelo Admin.
 *
 * O dono cola um link do YouTube no painel e o vídeo aparece no topo da
 * página; apaga, e a página volta a viver sem vídeo. É exatamente o que um
 * teste A/B manual precisa: liga numa semana, desliga na outra, compara.
 *
 * Guardamos o link em config_sistema (não em env) para valer sem redeploy.
 */

/*
 * Aceita os formatos que uma pessoa realmente cola:
 *   youtube.com/watch?v=ID · youtu.be/ID · youtube.com/shorts/ID
 *   youtube.com/embed/ID   · youtube.com/live/ID
 * O id do YouTube tem 11 caracteres de [A-Za-z0-9_-].
 */
export function idDoYoutube(bruto: string): string | null {
  const url = bruto.trim();
  if (!url) return null;
  const padroes = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of padroes) {
    const m = url.match(p);
    if (m) return m[1];
  }
  // Colou só o id? Também vale.
  return /^[A-Za-z0-9_-]{11}$/.test(url) ? url : null;
}

export async function videoDaLanding(): Promise<{ embedUrl: string; watchUrl: string } | null> {
  /*
   * NUNCA derruba a página de vendas. A landing é pré-renderizada no build, e
   * build (local, CI) pode não ter as credenciais do banco — nesse caso a
   * página nasce sem vídeo e a primeira revalidação no ar o traz de volta.
   */
  let valor = "";
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("config_sistema")
      .select("valor")
      .eq("chave", "landing_video_url")
      .maybeSingle();
    valor = (data as { valor: string } | null)?.valor ?? "";
  } catch {
    return null;
  }
  const id = idDoYoutube(valor);
  if (!id) return null;
  return {
    // nocookie: o embed do YouTube sem rastreio até o play — melhor para uma
    // página de vendas que promete profissionalismo.
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`,
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
  };
}
