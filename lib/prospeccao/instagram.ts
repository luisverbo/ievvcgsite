// Helpers puros do Instagram — rodam no painel e no agente, e dá para testar.

export type FotoIG = { url: string; legenda?: string };

export type DadosIG = {
  nome?: string;
  bio?: string;
  seguidores?: number;
  posts?: number;
  fotos: FotoIG[];
};

export type StatusIG = "ok" | "privado" | "nao_encontrado" | "bloqueado" | "erro";

/*
 * Ritmo da captura.
 *
 * O Instagram não bloqueia por quantidade absoluta, e sim por rajada: dez
 * perfis em dois minutos derruba o acesso na hora, os mesmos dez espaçados ao
 * longo do dia passam batido. Por isso é uma tarefa por vez na fila (o agente
 * ainda espera de 1,5 a 4 minutos entre uma e outra) e um teto por dia.
 */
export const IG_FILA_MAX = 1;
export const IG_LIMITE_DIA = 15;

/*
 * Extrai o @usuario de qualquer forma que o endereço venha.
 *
 * O que chega do Google Maps e do OSM é bem variado: link completo, link de
 * post, com barra no fim, com parâmetros de campanha, ou só o arroba.
 */
export function usuarioInstagram(bruto: string | null | undefined): string | null {
  if (!bruto) return null;
  let v = bruto.trim();

  if (!/instagram\.com/i.test(v)) {
    // Veio só o nome: "@padaria" ou "padaria".
    const so = v.replace(/^@/, "");
    return /^[A-Za-z0-9._]{1,30}$/.test(so) ? so.toLowerCase() : null;
  }

  v = v.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  const caminho = v.split("?")[0].split("#")[0].replace(/^instagram\.com\/?/i, "");
  const primeiro = caminho.split("/").filter(Boolean)[0];
  if (!primeiro) return null;

  // /p/, /reel/, /explore/ etc. são conteúdo, não perfil.
  const reservados = ["p", "reel", "reels", "explore", "stories", "tv", "accounts", "direct"];
  if (reservados.includes(primeiro.toLowerCase())) return null;

  return /^[A-Za-z0-9._]{1,30}$/.test(primeiro) ? primeiro.toLowerCase() : null;
}

/*
 * Acha o Instagram da empresa em qualquer campo onde ele possa estar.
 *
 * Muita empresa cadastra o Instagram COMO site no Google Meu Negócio — não
 * tem site próprio, então põe o perfil ali. Olhar só o campo "instagram"
 * deixaria essas de fora, que são justamente as melhores oportunidades.
 */
export function usuarioInstagramDe(p: {
  instagram?: string | null;
  website?: string | null;
}): string | null {
  return usuarioInstagram(p.instagram) ?? usuarioInstagram(p.website);
}

// "12,5 mil" / "1.234" / "3.2M" -> número
export function numeroIG(texto: string | undefined | null): number | undefined {
  if (!texto) return undefined;
  const limpo = texto.trim().toLowerCase().replace(/\s+/g, " ");
  // Ordem importa: "milhão" precisa vir antes de "mil", senão "1 milhão"
  // casaria só o "mil" e viraria mil em vez de um milhão.
  const m = /^([\d.,]+)\s*(milhões|milhoes|milhão|milhao|mil|mi|m|k)?\b/.exec(limpo);
  if (!m) return undefined;

  // Formato brasileiro: ponto é milhar, vírgula é decimal.
  const bruto = m[1];
  const numero = bruto.includes(",")
    ? Number(bruto.replace(/\./g, "").replace(",", "."))
    : Number(bruto.replace(/\./g, ""));
  if (!Number.isFinite(numero)) return undefined;

  const sufixo = m[2];
  if (!sufixo) return Math.round(numero);
  if (sufixo === "mil" || sufixo === "k") return Math.round(numero * 1_000);
  return Math.round(numero * 1_000_000); // mi, m, milhão, milhões
}

// Resumo do perfil para o briefing da IA. Vazio quando não há nada útil.
export function resumoParaBriefing(d: {
  ig_nome?: string | null;
  ig_bio?: string | null;
  ig_seguidores?: number | null;
}): string {
  const partes: string[] = [];
  if (d.ig_nome) partes.push(`Nome no Instagram: ${d.ig_nome}`);
  if (d.ig_bio) partes.push(`Bio do Instagram: "${d.ig_bio}"`);
  if (d.ig_seguidores) partes.push(`${d.ig_seguidores} seguidores`);
  return partes.join("\n");
}
