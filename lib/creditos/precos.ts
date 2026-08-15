/*
 * Quanto custa cada chamada de IA, em microdólares.
 *
 * Microdólar = 1/1.000.000 de dólar. Uma chamada pequena custa fração de
 * centavo; se o saldo fosse guardado em centavos, cada arredondamento comeria
 * ou daria dinheiro. Inteiro também evita erro de ponto flutuante.
 *
 * Arquivo puro de propósito: dá para testar e roda no navegador (a tela de
 * saldo estima o custo antes de gerar).
 */

export const MICRO = 1_000_000; // microdólares em 1 dólar

// Preço por 1 milhão de tokens, em dólares (tabela da Anthropic/OpenAI).
type Tabela = { entrada: number; saida: number };

const PRECOS: Record<string, Tabela> = {
  "claude-fable-5": { entrada: 10, saida: 50 },
  "claude-opus-5": { entrada: 5, saida: 25 },
  "claude-sonnet-5": { entrada: 3, saida: 15 },
  "claude-haiku-4-5": { entrada: 1, saida: 5 },
  // Texto dos ebooks
  "gpt-4o-mini": { entrada: 0.15, saida: 0.6 },
  "gpt-4o": { entrada: 2.5, saida: 10 },
  "gpt-4.1": { entrada: 2, saida: 8 },
};

// Modelo desconhecido não pode sair de graça: cobramos pelo mais caro da casa.
const FALLBACK: Tabela = { entrada: 10, saida: 50 };

export type UsoTokens = {
  entrada: number;
  saida: number;
  // Cache da Anthropic: gravar custa 1,25× a entrada, ler custa 0,1×.
  cacheGravado?: number;
  cacheLido?: number;
};

/*
 * Custo de uma chamada, em microdólares, já arredondado para cima.
 *
 * Para cima de propósito: o arredondamento sempre a nosso favor evita que
 * milhares de chamadas minúsculas fiquem custando zero.
 */
export function custoEmMicro(modelo: string, uso: UsoTokens): number {
  const p = PRECOS[modelo] ?? FALLBACK;
  const porToken = (dolaresPorMilhao: number) => (dolaresPorMilhao * MICRO) / 1_000_000;

  const total =
    uso.entrada * porToken(p.entrada) +
    uso.saida * porToken(p.saida) +
    (uso.cacheGravado ?? 0) * porToken(p.entrada * 1.25) +
    (uso.cacheLido ?? 0) * porToken(p.entrada * 0.1);

  return Math.ceil(total);
}

// Custo de uma imagem gerada, em microdólares (gpt-image-1 / dall-e-3).
export const CUSTO_IMAGEM: Record<string, number> = {
  media: 40_000, // ~US$0,04
  alta: 190_000, // ~US$0,19
};

/* --------------------------------- telas --------------------------------- */

// "US$ 4,82"
export function emDolar(micro: number): string {
  return `US$ ${(micro / MICRO).toFixed(2).replace(".", ",")}`;
}

/*
 * Quantas páginas ainda dá para gerar com o saldo.
 *
 * Serve para a frase "dá para umas 8 páginas" no painel, que é o que o cliente
 * entende — saldo em dólar sozinho não diz nada para quem nunca usou API.
 */
/*
 * Medido: uma página cheia no Opus 5 dá ~US$0,51 (no Fable 5, ~US$1,06).
 *
 * A conta usa o Opus com uma folga, porque é o modelo que o CLIENTE usa —
 * desde que o seletor virou coisa de admin, todo site dele sai no Opus.
 * Estimar pelo Fable aqui faria a tela prometer metade das páginas que o
 * crédito realmente entrega, e o plano parecer mesquinho à toa.
 *
 * A folga (0,55 em vez de 0,51) cobre página longa e ajuste que regenera o
 * documento inteiro — melhor entregar uma página a mais que uma a menos.
 */
export const CUSTO_TIPICO_PAGINA = 550_000;

export function paginasRestantes(micro: number): number {
  return Math.floor(micro / CUSTO_TIPICO_PAGINA);
}

/* ------------------------------- venda ----------------------------------- */

/*
 * Pacotes de crédito. O cliente paga em real com margem embutida; o saldo
 * creditado é o valor cheio em dólar de API.
 *
 * A margem cobre imposto, taxa do meio de pagamento e a variação do câmbio —
 * o crédito é vendido hoje e consumido daqui a semanas, com o dólar já outro.
 */
export const COTACAO_VENDA = 8.5; // R$ por dólar de crédito (câmbio + margem)

// Os rótulos seguem CUSTO_TIPICO_PAGINA — mudou o custo, mude os três juntos.
export const PACOTES: { dolares: number; preco: number; rotulo: string }[] = [
  { dolares: 10, preco: 85, rotulo: "≈ 18 páginas" },
  { dolares: 25, preco: 199, rotulo: "≈ 45 páginas" },
  { dolares: 50, preco: 379, rotulo: "≈ 90 páginas" },
];

export function pacoteValido(dolares: number) {
  return PACOTES.find((p) => p.dolares === dolares) ?? null;
}
