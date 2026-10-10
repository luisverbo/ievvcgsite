// Metadados dos modelos. Fica separado de anthropic.ts (que é server-only)
// porque o seletor de modelo roda no navegador.

/*
 * Os modelos antigos continuam na lista de propósito.
 *
 * Cada página guarda o modelo com que foi feita. Tirar um daqui faria
 * `modeloValido` devolver o padrão em silêncio, e uma página que o cliente
 * fez no Fable passaria a ser ajustada por outro modelo sem ninguém avisar.
 * Sair da lista é decisão separada de parar de oferecer.
 */
export const MODELOS_IA: Record<string, { rotulo: string; nota: string }> = {
  "claude-opus-5-5": {
    rotulo: "Claude Opus 5.5",
    nota: "padrão — o melhor custo-benefício (~US$0,41 por página)",
  },
  "claude-fable-5-1": {
    rotulo: "Claude Fable 5.1",
    nota: "o mais capaz, custa 2,5× mais (~US$1,06) — para página difícil",
  },
  "claude-opus-5": {
    rotulo: "Claude Opus 5",
    nota: "geração anterior (~US$0,51 por página)",
  },
  "claude-fable-5": {
    rotulo: "Claude Fable 5",
    nota: "geração anterior, o mais caro (~US$1,06)",
  },
};

/*
 * O padrão vale para TODA página, e o cliente não escolhe.
 *
 * A escolha de modelo não é funcionalidade: é a alavanca que decide a
 * velocidade com que o crédito dele queima — entregue a alguém que não sabe o
 * que "Fable" significa. Quem escolhesse o dobro do preço esgotaria a cota na
 * metade do tempo e abriria chamado dizendo que o crédito acabou rápido.
 *
 * No Opus 5.5 a mesma cota de US$15 rende ~36 páginas em vez de ~14, e para
 * uma landing page de negócio local a diferença de qualidade não aparece. O
 * seletor continua existindo para o ADMIN, como escape em página difícil.
 */
/*
 * O Opus 5.5 virou o padrão porque é melhor E mais barato que o Opus 5
 * ($4/$20 por milhão de tokens contra $5/$25). Trocar o padrão para algo
 * melhor e mais caro exigiria conversa; para algo melhor e mais barato, não.
 */
export const MODELO_PADRAO = "claude-opus-5-5";

export function modeloValido(m: string | null | undefined) {
  return m && MODELOS_IA[m] ? m : MODELO_PADRAO;
}
