// Metadados dos modelos. Fica separado de anthropic.ts (que é server-only)
// porque o seletor de modelo roda no navegador.

export const MODELOS_IA: Record<string, { rotulo: string; nota: string }> = {
  "claude-fable-5": {
    rotulo: "Claude Fable 5",
    nota: "o mais capaz — melhor design (~US$0,30 a 0,80 por página)",
  },
  "claude-opus-5": {
    rotulo: "Claude Opus 5",
    nota: "metade do preço, ótimo para ajustes (~US$0,15 a 0,40)",
  },
};

export const MODELO_PADRAO = "claude-fable-5";

export function modeloValido(m: string | null | undefined) {
  return m && MODELOS_IA[m] ? m : MODELO_PADRAO;
}
