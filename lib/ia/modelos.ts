// Metadados dos modelos. Fica separado de anthropic.ts (que é server-only)
// porque o seletor de modelo roda no navegador.

export const MODELOS_IA: Record<string, { rotulo: string; nota: string }> = {
  "claude-opus-5": {
    rotulo: "Claude Opus 5",
    nota: "padrão — ótimo design pela metade do custo (~US$0,50 por página)",
  },
  "claude-fable-5": {
    rotulo: "Claude Fable 5",
    nota: "o mais capaz, custa o dobro (~US$1,06) — para página difícil",
  },
};

/*
 * Opus 5 é o padrão de TODA página, e o cliente não escolhe.
 *
 * A escolha de modelo não é funcionalidade: é a alavanca que decide a
 * velocidade com que o crédito dele queima — entregue a alguém que não sabe o
 * que "Fable" significa. Quem escolhesse o dobro do preço esgotaria a cota na
 * metade do tempo e abriria chamado dizendo que o crédito acabou rápido.
 *
 * No Opus a mesma cota de US$15 rende ~29 páginas em vez de ~14, e para uma
 * landing page de negócio local a diferença de qualidade não aparece. O
 * seletor continua existindo para o ADMIN, como escape em página difícil.
 */
export const MODELO_PADRAO = "claude-opus-5";

export function modeloValido(m: string | null | undefined) {
  return m && MODELOS_IA[m] ? m : MODELO_PADRAO;
}
