import "server-only";

import { chamarLLM } from "./llm";
import type { Formula } from "./dissecar";

/*
 * O roteiro: a fórmula vira um vídeo NOVO, sobre o assunto que o dono quiser.
 *
 * A fórmula entra como MECÂNICA (gancho, blocos, ritmo, CTA) — nunca como
 * texto para reescrever. É a linha que separa "estudei o que funciona" de
 * "copiei o vídeo do outro", e ela está no prompt de propósito.
 *
 * Sai também a lista de termos de busca EM INGLÊS, porque é isso que o
 * Pexels/Pixabay entendem. Mandar os termos prontos evita que o
 * MoneyPrinterTurbo tente inventá-los com o LLM dele (a falha que aparece
 * como "failed to generate video search terms" quando ele está sem chave).
 */

export type RoteiroGerado = {
  titulo: string;
  roteiro: string;
  termos: string[];
  modelo: string;
};

const SYSTEM = `Você escreve roteiros de vídeos curtos (Shorts/Reels/TikTok) em português do Brasil, para narração em off.

Você recebe uma FÓRMULA extraída de vídeos que viralizaram e um ASSUNTO novo. Use a fórmula como MECÂNICA — a estrutura, o tipo de gancho, o ritmo, o momento do CTA. O conteúdo é 100% original sobre o assunto pedido: é proibido reaproveitar frases dos vídeos analisados.

REGRAS DO ROTEIRO:
- Escreva APENAS o texto que será narrado. Sem marcações de cena, sem "[música]", sem indicação de tempo, sem emoji, sem títulos de seção — o texto vai direto para a narração e qualquer marcação seria lida em voz alta.
- Frases curtas e faladas, como uma pessoa explicando. Nada de linguagem de folheto.
- Respeite a duração pedida: no português falado, conte ~15 palavras por 10 segundos.
- Os primeiros 3 segundos são o gancho e seguem o padrão da fórmula.
- Termine com o CTA no formato que a fórmula indica.
- Não invente estatística, número, data nem estudo. Sem dado real, fale em termos gerais.

TERMOS DE BUSCA: 4 a 6 palavras-chave EM INGLÊS para achar clipes de banco de imagens que ilustrem o vídeo. Preferir palavras únicas, concretas e comuns ("office", "laptop", "handshake") — expressões longas não trazem resultado.

TÍTULO: uma linha, seguindo o padrão de título da fórmula.

Responda APENAS com JSON válido, sem markdown:
{"titulo":"...","roteiro":"texto corrido da narração","termos":["office","laptop"]}`;

export async function escreverRoteiro(
  assunto: string,
  formula: Formula,
  duracaoAlvoS: number,
): Promise<RoteiroGerado> {
  const palavras = Math.round((duracaoAlvoS / 10) * 15);
  const corpo = `ASSUNTO do vídeo novo: ${assunto}

DURAÇÃO ALVO: ${duracaoAlvoS} segundos (cerca de ${palavras} palavras)

FÓRMULA a seguir (mecânica, não conteúdo):
${JSON.stringify(formula, null, 2)}`;

  const r = await chamarLLM("roteiro", SYSTEM, corpo, 1500);

  const inicio = r.texto.indexOf("{");
  const fim = r.texto.lastIndexOf("}");
  if (inicio === -1 || fim <= inicio) throw new Error("A IA não devolveu o roteiro em JSON — tente de novo.");
  const bruto = JSON.parse(r.texto.slice(inicio, fim + 1)) as Partial<RoteiroGerado>;

  const roteiro = String(bruto.roteiro ?? "").trim();
  if (roteiro.length < 60) throw new Error("O roteiro veio curto demais — tente de novo.");

  const termos = (Array.isArray(bruto.termos) ? bruto.termos : [])
    .map((t) => String(t).trim().toLowerCase())
    .filter((t) => t.length > 1 && /^[a-z0-9 ]+$/.test(t))
    .slice(0, 6);

  return {
    titulo: String(bruto.titulo ?? assunto).trim().slice(0, 200),
    roteiro,
    // Sem termos válidos o MPT tentaria inventá-los e falharia; este mínimo
    // genérico garante que a renderização acontece.
    termos: termos.length > 0 ? termos : ["business", "office", "people", "city"],
    modelo: r.modelo,
  };
}


/*
 * Adaptar UM vídeo específico: seguir de perto o que ele faz, com palavras
 * próprias.
 *
 * A diferença para a fórmula: a fórmula abstrai o padrão de vários vídeos e
 * escreve algo novo; aqui o modelo é UM vídeo, e o roteiro acompanha a mesma
 * ordem de argumentos, as mesmas viradas e o mesmo ritmo — que é o que faz
 * um vídeo funcionar de novo.
 *
 * O limite é escrito no prompt e não é decoração: reproduzir as frases do
 * outro é a obra dele, e conteúdo duplicado é o caminho conhecido para
 * alcance zero. Mesma espinha dorsal, texto próprio.
 */
const SYSTEM_ADAPTAR = `Você recria vídeos curtos que deram certo, em português do Brasil, para narração em off.

Recebe a TRANSCRIÇÃO de um vídeo que viralizou e o ASSUNTO do vídeo novo. Seu trabalho é escrever um roteiro que SIGA DE PERTO o vídeo original: a mesma ordem de argumentos, os mesmos momentos de virada, o mesmo tipo de gancho e o mesmo ritmo.

REGRAS INEGOCIÁVEIS:
- Escreva com PALAVRAS PRÓPRIAS. É proibido reaproveitar frases da transcrição — nenhuma sequência de 6 palavras seguidas pode ser igual à do original. A estrutura é o que se aproveita; o texto é seu.
- Se o ASSUNTO for diferente do vídeo original, transponha a mecânica para o novo assunto (o mesmo tipo de gancho, adaptado ao tema).
- Se o ASSUNTO for igual ou vazio, escreva a SUA versão do mesmo tema.
- Apenas o texto que será narrado: sem marcação de cena, sem indicação de tempo, sem emoji, sem título de seção — tudo isso seria lido em voz alta.
- Frases curtas e faladas. No português falado, conte ~15 palavras por 10 segundos.
- Não invente estatística, número, data nem estudo. Sem dado real, fale em termos gerais.

TERMOS DE BUSCA: 4 a 6 palavras EM INGLÊS para achar clipes de banco de imagens. Palavras únicas, concretas e comuns ("office", "laptop", "handshake").

Responda APENAS com JSON válido, sem markdown:
{"titulo":"...","roteiro":"texto corrido da narração","termos":["office","laptop"]}`;

export async function adaptarRoteiro(
  transcricao: string,
  assunto: string,
  duracaoAlvoS: number,
  tituloOriginal: string,
): Promise<RoteiroGerado> {
  const palavras = Math.round((duracaoAlvoS / 10) * 15);
  const corpo = `VÍDEO ORIGINAL (título): ${tituloOriginal}

ASSUNTO do vídeo novo: ${assunto.trim() || "o mesmo tema do original, na sua própria versão"}

DURAÇÃO ALVO: ${duracaoAlvoS} segundos (cerca de ${palavras} palavras)

TRANSCRIÇÃO do original (matéria de análise — não copie frases):
${transcricao.slice(0, 10_000)}`;

  const r = await chamarLLM("roteiro", SYSTEM_ADAPTAR, corpo, 3000);

  const inicio = r.texto.indexOf("{");
  const fim = r.texto.lastIndexOf("}");
  if (inicio === -1 || fim <= inicio) {
    throw new Error(
      r.parou === "max_tokens"
        ? `O modelo ${r.modelo} cortou a resposta — tente uma duração menor.`
        : `O modelo ${r.modelo} não devolveu JSON. Tente de novo.`,
    );
  }
  const bruto = JSON.parse(r.texto.slice(inicio, fim + 1)) as Partial<RoteiroGerado>;

  const roteiro = String(bruto.roteiro ?? "").trim();
  if (roteiro.length < 60) throw new Error("O roteiro veio curto demais — tente de novo.");

  const termos = (Array.isArray(bruto.termos) ? bruto.termos : [])
    .map((t) => String(t).trim().toLowerCase())
    .filter((t) => t.length > 1 && /^[a-z0-9 ]+$/.test(t))
    .slice(0, 6);

  return {
    titulo: String(bruto.titulo ?? (assunto || tituloOriginal)).trim().slice(0, 200),
    roteiro,
    termos: termos.length > 0 ? termos : ["business", "office", "people", "city"],
    modelo: r.modelo,
  };
}
