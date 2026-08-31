import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Os pixels das SUAS páginas de venda (/ e /prospector).
 *
 * Não confundir com o pixel que o cliente põe na página DELE (esse mora em
 * sites_ia.facebook_pixel_id e é servido por lib/ia/servir.ts): aqui é o seu,
 * o do dono do PáginaPro, para medir e otimizar os anúncios que trazem gente
 * para as landings.
 *
 * Mora em config_sistema, como o vídeo da landing, e pelo mesmo motivo: colar
 * um ID novo não pode exigir deploy — campanha se ajusta no meio da tarde.
 *
 * De propósito NÃO entra no painel (/app): rastrear cliente logado dentro do
 * produto não ajuda anúncio nenhum e é dado que não temos por que mandar para
 * fora.
 */

export type PixelVendas = {
  /* ID do Meta/Facebook — só dígitos, como aparece no Gerenciador de Eventos. */
  meta: string;
  /* Tag do Google: G-XXXX (Analytics 4) ou AW-XXXX (Google Ads). */
  google: string;
  /* Escape hatch: qualquer outro script (TikTok, Clarity, Hotjar…). */
  extra: string;
};

export const PIXEL_VAZIO: PixelVendas = { meta: "", google: "", extra: "" };

export const CHAVES_PIXEL = {
  meta: "pixel_meta_id",
  google: "pixel_google_id",
  extra: "pixel_extra_head",
} as const;

/* Só dígitos: um ID do Meta é numérico, e isso já barra script injetado. */
export function metaValido(v: string): boolean {
  return /^\d{6,20}$/.test(v.trim());
}

/* G-XXXXXXX (GA4) ou AW-XXXXXXXXX (Google Ads). */
export function googleValido(v: string): boolean {
  return /^(G|AW|GT)-[A-Z0-9]{4,20}$/i.test(v.trim());
}

export async function pixelDasVendas(): Promise<PixelVendas> {
  /*
   * NUNCA derruba a página de vendas. As landings são pré-renderizadas, e o
   * build (local, CI) pode não ter credencial de banco — nesse caso a página
   * nasce sem pixel e a primeira revalidação no ar o traz.
   */
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("config_sistema")
      .select("chave, valor")
      .in("chave", [CHAVES_PIXEL.meta, CHAVES_PIXEL.google, CHAVES_PIXEL.extra]);
    const linhas = (data ?? []) as { chave: string; valor: string }[];
    const achar = (c: string) => linhas.find((l) => l.chave === c)?.valor?.trim() ?? "";
    return {
      meta: achar(CHAVES_PIXEL.meta),
      google: achar(CHAVES_PIXEL.google),
      extra: achar(CHAVES_PIXEL.extra),
    };
  } catch {
    return PIXEL_VAZIO;
  }
}
