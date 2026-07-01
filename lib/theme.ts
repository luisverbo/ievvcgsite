import type { Tema } from "@/lib/types";

// Cores padrão da prévia aprovada. As chaves são usadas no jsonb `tema.cores`
// de config_evento e nos names dos inputs do painel (cor_<chave>).
export const CORES_PADRAO = {
  night: "#1e0f26",
  night2: "#2a1732",
  night3: "#37203f",
  cream: "#fbf1df",
  creamDim: "#d9c7c0",
  gold: "#f4a62a",
  coral: "#ef5b43",
  green: "#37b08a",
  pink: "#ea5c93",
  violet: "#9d6be0",
} as const;

export type CorKey = keyof typeof CORES_PADRAO;

// Paletas prontas para o usuário escolher com um clique. Ainda pode ajustar
// cor a cor depois nos seletores.
export const PRESETS_TEMA: Record<string, { label: string; cores: Record<CorKey, string> }> = {
  padrao: {
    label: "Roxo & Dourado (padrão)",
    cores: { ...CORES_PADRAO },
  },
  azul: {
    label: "Azul Noturno",
    cores: {
      night: "#0b1b2e",
      night2: "#12263f",
      night3: "#1b3350",
      cream: "#f2f6fb",
      creamDim: "#c3d0e0",
      gold: "#f6c453",
      coral: "#ff6b5e",
      green: "#3fb9a6",
      pink: "#e878a6",
      violet: "#7aa2e3",
    },
  },
  verde: {
    label: "Verde Floresta",
    cores: {
      night: "#0e2018",
      night2: "#143026",
      night3: "#1d4234",
      cream: "#f3f7ee",
      creamDim: "#c8d6c2",
      gold: "#e7b64b",
      coral: "#ef6a4b",
      green: "#4cc38a",
      pink: "#e58fb0",
      violet: "#9a86d8",
    },
  },
  vermelho: {
    label: "Vermelho Festa",
    cores: {
      night: "#2a0d12",
      night2: "#3a141b",
      night3: "#4a1c24",
      cream: "#fdf0ea",
      creamDim: "#e2c3bd",
      gold: "#f5b13a",
      coral: "#ff5c47",
      green: "#43b78c",
      pink: "#f06a9b",
      violet: "#b57ae0",
    },
  },
  preto: {
    label: "Preto & Dourado",
    cores: {
      night: "#0f0f10",
      night2: "#191919",
      night3: "#242424",
      cream: "#f5efe2",
      creamDim: "#c9c2b3",
      gold: "#e8b84b",
      coral: "#e8863a",
      green: "#4cae8a",
      pink: "#dd6f9c",
      violet: "#9a7fd0",
    },
  },
};

export const COR_LABELS: Record<CorKey, string> = {
  night: "Fundo principal",
  night2: "Painéis e cards",
  night3: "Card do ingresso",
  cream: "Texto claro",
  creamDim: "Texto secundário",
  gold: "Destaque (dourado)",
  coral: "Botões e ações",
  green: "Verde (kids / WhatsApp)",
  pink: "Rosa (bazar)",
  violet: "Violeta (galeria)",
};

const COR_CSS_VAR: Record<CorKey, string> = {
  night: "--color-night",
  night2: "--color-night-2",
  night3: "--color-night-3",
  cream: "--color-cream",
  creamDim: "--color-cream-dim",
  gold: "--color-gold",
  coral: "--color-coral",
  green: "--color-green",
  pink: "--color-pink",
  violet: "--color-violet",
};

type FonteGoogle = { css: string; family: string };

// Fontes alternativas carregadas via Google Fonts em runtime. As padrão
// (Bricolage Grotesque / Figtree) continuam self-hosted via next/font.
export const FONTES_TITULO: Record<string, FonteGoogle> = {
  Anton: { css: "Anton", family: "'Anton', sans-serif" },
  "Archivo Black": { css: "Archivo+Black", family: "'Archivo Black', sans-serif" },
  "Bebas Neue": { css: "Bebas+Neue", family: "'Bebas Neue', sans-serif" },
  "Alfa Slab One": { css: "Alfa+Slab+One", family: "'Alfa Slab One', serif" },
  Fraunces: { css: "Fraunces:opsz,wght@9..144,800", family: "'Fraunces', serif" },
  Oswald: { css: "Oswald:wght@600;700", family: "'Oswald', sans-serif" },
  Montserrat: { css: "Montserrat:wght@800;900", family: "'Montserrat', sans-serif" },
};

export const FONTES_TEXTO: Record<string, FonteGoogle> = {
  Inter: { css: "Inter:wght@400;500;600;700", family: "'Inter', sans-serif" },
  Poppins: { css: "Poppins:wght@400;500;600;700", family: "'Poppins', sans-serif" },
  Nunito: { css: "Nunito:wght@400;500;600;700", family: "'Nunito', sans-serif" },
  "Work Sans": { css: "Work+Sans:wght@400;500;600;700", family: "'Work Sans', sans-serif" },
  "DM Sans": { css: "DM+Sans:wght@400;500;600;700", family: "'DM Sans', sans-serif" },
};

// CSS injetado no layout para sobrescrever as variáveis do tema. Fica fora
// das @layer do Tailwind, então vence as definições do @theme.
export function buildThemeCss(tema: Tema): string | null {
  const decls: string[] = [];

  for (const key of Object.keys(CORES_PADRAO) as CorKey[]) {
    const cor = tema.cores?.[key];
    if (cor) decls.push(`${COR_CSS_VAR[key]}:${cor}`);
  }

  const fonteTitulo = tema.fonte_titulo ? FONTES_TITULO[tema.fonte_titulo] : undefined;
  if (fonteTitulo) decls.push(`--font-display:${fonteTitulo.family}`);

  const fonteTexto = tema.fonte_texto ? FONTES_TEXTO[tema.fonte_texto] : undefined;
  if (fonteTexto) decls.push(`--font-sans:${fonteTexto.family}`);

  return decls.length > 0 ? `:root{${decls.join(";")}}` : null;
}

export function googleFontsHref(tema: Tema): string | null {
  const families: string[] = [];

  const fonteTitulo = tema.fonte_titulo ? FONTES_TITULO[tema.fonte_titulo] : undefined;
  if (fonteTitulo) families.push(fonteTitulo.css);

  const fonteTexto = tema.fonte_texto ? FONTES_TEXTO[tema.fonte_texto] : undefined;
  if (fonteTexto) families.push(fonteTexto.css);

  if (families.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap`;
}
