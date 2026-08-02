import { Fragment, type ReactNode } from "react";

/*
 * Formatação simples nos textos do usuário, com marcadores:
 *   **negrito**   _itálico_   __sublinhado__   ==destaque==
 *   {cor:#ff0000}texto colorido{/cor}
 *
 * O texto é convertido em elementos React (nunca innerHTML), então não há
 * risco de injeção: qualquer HTML digitado aparece como texto puro.
 */

type Regra = {
  re: RegExp;
  envolver: (conteudo: ReactNode, m: RegExpExecArray, chave: string) => ReactNode;
  grupo: number; // índice do grupo com o conteúdo interno
};

const COR_OK = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z-]{3,24})$/;

const REGRAS: Regra[] = [
  {
    re: /\{cor:([^}]{1,24})\}([\s\S]+?)\{\/cor\}/,
    grupo: 2,
    envolver: (conteudo, m, chave) => {
      const cor = m[1].trim();
      return (
        <span key={chave} style={COR_OK.test(cor) ? { color: cor } : undefined}>
          {conteudo}
        </span>
      );
    },
  },
  { re: /\*\*([\s\S]+?)\*\*/, grupo: 1, envolver: (c, _m, k) => <strong key={k}>{c}</strong> },
  { re: /__([\s\S]+?)__/, grupo: 1, envolver: (c, _m, k) => <u key={k}>{c}</u> },
  { re: /==([\s\S]+?)==/, grupo: 1, envolver: (c, _m, k) => <mark key={k} className="pp-marca">{c}</mark> },
  { re: /(?<![A-Za-z0-9])_([\s\S]+?)_(?![A-Za-z0-9])/, grupo: 1, envolver: (c, _m, k) => <em key={k}>{c}</em> },
];

function analisar(texto: string, chave = "r"): ReactNode {
  // Procura o marcador que aparece primeiro no texto.
  let melhor: { m: RegExpExecArray; regra: Regra } | null = null;
  for (const regra of REGRAS) {
    const m = regra.re.exec(texto);
    if (m && (!melhor || m.index < melhor.m.index)) melhor = { m, regra };
  }
  if (!melhor) return texto;

  const { m, regra } = melhor;
  const antes = texto.slice(0, m.index);
  const depois = texto.slice(m.index + m[0].length);
  return (
    <Fragment key={chave}>
      {antes}
      {regra.envolver(analisar(m[regra.grupo], `${chave}i`), m, `${chave}m`)}
      {analisar(depois, `${chave}d`)}
    </Fragment>
  );
}

// Renderiza um texto do usuário com a formatação aplicada.
export function Rico({ children }: { children?: string | null }) {
  if (!children) return null;
  return <>{analisar(children)}</>;
}
