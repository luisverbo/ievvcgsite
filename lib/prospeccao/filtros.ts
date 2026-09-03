import type { EmpresaEncontrada } from "./tipos.ts";

/*
 * Os filtros da busca — o que o agente GRAVA e o que ele descarta.
 *
 * Sem isto, buscar "clínica de estética em Campinas" trazia 20 empresas e o
 * vendedor gastava a manhã limpando a lista: o consultório sem telefone
 * celular, a rede grande que nunca responde WhatsApp de desconhecido, o
 * cadastro morto sem uma avaliação. Filtrar depois é trabalho manual; aqui é
 * de graça.
 *
 * Este arquivo é PURO de propósito (nenhum import de banco, de React, de
 * Playwright): ele viaja dentro do .zip do agente e roda igual nos dois
 * lados.
 */

export type FiltrosBusca = {
  /* "tanto_faz" | "sem" (só quem não tem site) | "com" (só quem já tem) */
  site: "tanto_faz" | "sem" | "com";
  /* Só empresas cujo telefone é celular — as únicas que abrem conversa. */
  soWhatsapp: boolean;
  /* Piso e teto de avaliações no Google. 0 = sem limite. */
  minAvaliacoes: number;
  maxAvaliacoes: number;
  /* Nota mínima (1 a 5). 0 = tanto faz. */
  minNota: number;
  /*
   * Pular empresas que JÁ estão na lista do cliente — de qualquer busca
   * anterior, não só desta. Quem repete "veterinária na Barra" quer as que
   * faltaram, não as 20 que já tem. O agente descarta pelo fonte_id antes de
   * abrir a ficha, então não custa tempo nem exposição ao Google.
   */
  evitarRepetidas: boolean;
};

export const FILTROS_VAZIOS: FiltrosBusca = {
  site: "tanto_faz",
  soWhatsapp: false,
  minAvaliacoes: 0,
  maxAvaliacoes: 0,
  minNota: 0,
  evitarRepetidas: false,
};

/* Teto: acima disso o "máximo" não está filtrando nada de útil. */
const AVALIACOES_TETO = 100_000;

/*
 * Aceita o que vier — do formulário, do banco, de um agente velho — e devolve
 * um objeto sempre completo. Filtro que chega meio quebrado tem que virar
 * "não filtra", nunca "não grava nada".
 */
export function normalizarFiltros(bruto: unknown): FiltrosBusca {
  const o = (bruto ?? {}) as Record<string, unknown>;
  const num = (v: unknown, teto: number) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n > 0 ? Math.min(n, teto) : 0;
  };
  const site = o.site === "sem" || o.site === "com" ? o.site : "tanto_faz";
  const minAvaliacoes = num(o.minAvaliacoes, AVALIACOES_TETO);
  let maxAvaliacoes = num(o.maxAvaliacoes, AVALIACOES_TETO);
  // Máximo menor que o mínimo não deixaria passar nada: o teto é ignorado.
  if (maxAvaliacoes && maxAvaliacoes < minAvaliacoes) maxAvaliacoes = 0;

  const notaBruta = Number(o.minNota);
  const minNota = Number.isFinite(notaBruta) && notaBruta > 0 ? Math.min(5, notaBruta) : 0;

  return {
    site,
    soWhatsapp: o.soWhatsapp === true,
    minAvaliacoes,
    maxAvaliacoes,
    minNota,
    evitarRepetidas: o.evitarRepetidas === true,
  };
}

/*
 * A chave que diz "é a mesma busca".
 *
 * Nicho e local viram minúsculas sem acento, sem pontuação e com espaços
 * simples: "Barra da Tijuca, Rio de Janeiro" e "barra da tijuca rio de
 * janeiro" são a mesma coisa para quem digita — e têm que ser para nós.
 */
export function chaveDaBusca(nicho: string, local: string): string {
  const n = (t: string) =>
    t
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .replace(/\s+/g, " ");
  return `${n(nicho)}|${n(local)}`;
}

export function temFiltro(f: FiltrosBusca): boolean {
  return (
    f.site !== "tanto_faz" ||
    f.soWhatsapp ||
    f.minAvaliacoes > 0 ||
    f.maxAvaliacoes > 0 ||
    f.minNota > 0
  );
}

/*
 * Celular brasileiro: DDD (2) + 9 + 8 dígitos.
 *
 * Repetido de mensagem.ts de propósito — aquele arquivo puxa meio painel
 * junto, e este aqui precisa caber dentro do agente sem carona.
 */
function ehCelular(bruto: string | undefined | null): boolean {
  if (!bruto) return false;
  let d = bruto.replace(/\D/g, "").replace(/^0+/, "");
  if (d.startsWith("55")) d = d.slice(2);
  return /^\d{2}9\d{8}$/.test(d);
}

/*
 * A pergunta única: esta empresa entra na lista?
 *
 * Empresa SEM avaliação nenhuma passa no filtro de nota — "sem nota" não é
 * "nota baixa". Quem quiser cortar esses usa o mínimo de avaliações, que é o
 * campo que existe para isso.
 */
export function passaNosFiltros(e: EmpresaEncontrada, f: FiltrosBusca): boolean {
  const temSite = Boolean(e.website && e.website.trim());
  if (f.site === "sem" && temSite) return false;
  if (f.site === "com" && !temSite) return false;

  if (f.soWhatsapp && !ehCelular(e.telefone)) return false;

  const av = e.avaliacoes ?? 0;
  if (f.minAvaliacoes && av < f.minAvaliacoes) return false;
  if (f.maxAvaliacoes && av > f.maxAvaliacoes) return false;

  if (f.minNota && (e.notaMedia ?? 0) < f.minNota) return false;

  return true;
}

/* O resumo em uma linha, para o painel mostrar o que aquela busca pediu. */
export function resumoFiltros(f: FiltrosBusca): string[] {
  const partes: string[] = [];
  if (f.site === "sem") partes.push("sem site");
  if (f.site === "com") partes.push("com site");
  if (f.soWhatsapp) partes.push("com WhatsApp");
  if (f.minAvaliacoes && f.maxAvaliacoes) {
    partes.push(`${f.minAvaliacoes} a ${f.maxAvaliacoes} avaliações`);
  } else if (f.minAvaliacoes) {
    partes.push(`${f.minAvaliacoes}+ avaliações`);
  } else if (f.maxAvaliacoes) {
    partes.push(`até ${f.maxAvaliacoes} avaliações`);
  }
  if (f.minNota) partes.push(`nota ${String(f.minNota).replace(".", ",")}+`);
  if (f.evitarRepetidas) partes.push("só empresas novas");
  return partes;
}
