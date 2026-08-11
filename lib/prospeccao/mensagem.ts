/*
 * Monta a mensagem de abordagem, personalizada por empresa.
 *
 * Duas coisas acontecem aqui, e as duas importam:
 *   1. Variáveis  {empresa}, {ramo}, {bairro}, {avaliacoes}, {nota}
 *   2. Variações  [Oi|Olá|Opa] — sorteia uma opção a cada mensagem
 *
 * A variação não é enfeite: mensagem idêntica repetida é o sinal mais óbvio
 * de disparo em massa, e é o que faz o WhatsApp bloquear o número. Texto
 * diferente a cada envio também converte melhor, porque não parece robô.
 *
 * Puro de propósito: roda no painel e no agente, e dá para testar.
 */

import { acharNicho } from "./nichos";

export const MODELO_PADRAO = `[Oi|Olá|Opa]! Tudo bem?

[Vi a|Encontrei a|Passei pela] {empresa} [aqui no|no] Google{prova}.

[Só que|Mas] não achei o site de vocês. [Eu trabalho com|Eu faço] criação de site para {ramo}, e [montei|preparei|fiz] um modelo pensando [na|especificamente na] {empresa}.

Posso te mandar [pra você dar uma olhada|para você ver como ficou]? Sem compromisso.`;

export type DadosEmpresa = {
  nome: string;
  nicho_busca?: string | null;
  categoria?: string | null;
  endereco?: string | null;
  local_busca?: string | null;
  avaliacoes?: number | null;
  nota_media?: number | null;
};

/*
 * Sorteia uma opção de cada bloco [a|b|c]. A semente vem do id do prospecto,
 * então a mesma empresa sempre recebe a mesma versão — importante para a
 * prévia do painel bater com o que é realmente enviado.
 */
function semente(texto: string): () => number {
  let h = 2166136261;
  for (const ch of `pp-abordagem::${texto}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  const proximo = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  // Aquece o gerador: sem isto, chaves parecidas caem na mesma opção do
  // primeiro bloco — e todas as mensagens começariam igual, que é exatamente
  // o padrão que o WhatsApp usa para detectar disparo.
  for (let i = 0; i < 8; i++) proximo();
  return proximo;
}

export function sortearVariacoes(texto: string, chave: string): string {
  const proximo = semente(chave);
  return texto.replace(/\[([^\][]+)\]/g, (todo, dentro: string) => {
    const opcoes = dentro.split("|").map((o) => o.trim());
    if (opcoes.length < 2) return todo;
    return opcoes[Math.floor(proximo() * opcoes.length)] ?? opcoes[0];
  });
}

// Bairro a partir do endereço ("Av. X, 100 · Barra da Tijuca · Rio de Janeiro").
function bairroDe(e: DadosEmpresa): string {
  const partes = e.endereco?.split("·").map((p) => p.trim()) ?? [];
  return partes[1] || e.local_busca?.split(",")[0]?.trim() || "";
}

// A prova social é opcional: sem avaliação, a frase some em vez de virar
// "vocês têm 0 avaliações", que soa péssimo.
function provaDe(e: DadosEmpresa): string {
  const n = e.avaliacoes ?? 0;
  if (n < 5) return "";
  const nota = e.nota_media && e.nota_media >= 4 ? ` e nota ${String(e.nota_media).replace(".", ",")}` : "";
  return ` e vi que vocês têm ${n} avaliações${nota} — sinal de que o pessoal gosta mesmo do trabalho`;
}

export function ramoDe(e: DadosEmpresa): string {
  const rotulo = acharNicho(e.nicho_busca ?? "")?.rotulo;
  if (rotulo) return rotulo.split("/")[0].trim().toLowerCase();
  return e.categoria?.toLowerCase() || "negócios locais";
}

export function montarMensagem(
  modelo: string,
  empresa: DadosEmpresa,
  chave: string,
): string {
  const valores: Record<string, string> = {
    empresa: empresa.nome,
    ramo: ramoDe(empresa),
    bairro: bairroDe(empresa),
    avaliacoes: String(empresa.avaliacoes ?? ""),
    nota: empresa.nota_media ? String(empresa.nota_media).replace(".", ",") : "",
    prova: provaDe(empresa),
  };

  const comVariacoes = sortearVariacoes(modelo || MODELO_PADRAO, chave);
  return comVariacoes
    .replace(/\{(\w+)\}/g, (todo, chaveVar: string) => valores[chaveVar] ?? todo)
    // Limpezas de pontuação que sobram quando uma variável vem vazia.
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([.,!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/*
 * Normaliza o telefone para o formato que o WhatsApp aceita (DDI + DDD +
 * número, só dígitos). Devolve null para fixo: WhatsApp em fixo é raro e
 * mandar para lá só gera erro e desconfiança.
 */
export function telefoneWhatsapp(bruto: string | null | undefined): string | null {
  if (!bruto) return null;
  let d = bruto.replace(/\D/g, "");
  if (d.startsWith("0")) d = d.replace(/^0+/, "");
  if (d.startsWith("55")) d = d.slice(2);
  // Celular brasileiro: DDD (2) + 9 + 8 dígitos.
  if (!/^\d{2}9\d{8}$/.test(d)) return null;
  return `55${d}`;
}
