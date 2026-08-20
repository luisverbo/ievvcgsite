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
 *
 * ---------------------------------------------------------------------------
 * POR QUE O ROTEIRO SAÍA FRACO — e o que mudou
 *
 * 1. Vinha CURTO PELA METADE. A conta antiga era "15 palavras por 10s"
 *    (90 palavras/minuto). A narração do Edge TTS em português fala perto de
 *    150 — então um pedido de 45s virava um texto de ~27s de áudio. Faltava
 *    quase metade do vídeo, e texto faltando lê como texto raso.
 * 2. Escrevia de UMA VEZ SÓ. Ninguém escreve bem de primeira; agora há uma
 *    segunda passada de EDITOR, que corta o que sobra e força o concreto.
 * 3. O briefing era uma linha. "Assunto: marketing" não dá tese nenhuma ao
 *    modelo, e sem tese ele preenche com lugar-comum. Agora entram público,
 *    ângulo e o que pedir no fim.
 * 4. O prompt só proibia; não ensinava. Agora ele carrega a mecânica de
 *    quem escreve short — abrir na tensão, uma ideia só, frase curta,
 *    concreto no lugar do abstrato.
 * ---------------------------------------------------------------------------
 */

/*
 * Ritmo real da narração. Edge TTS em pt-BR, voz neural na velocidade
 * padrão, fica em torno de 150 palavras por minuto = 2,5 por segundo.
 */
const PALAVRAS_POR_SEGUNDO = 2.5;

export function palavrasAlvo(segundos: number): number {
  return Math.round(segundos * PALAVRAS_POR_SEGUNDO);
}

export function contarPalavras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

export function segundosDoTexto(texto: string): number {
  return Math.round(contarPalavras(texto) / PALAVRAS_POR_SEGUNDO);
}

/* O que o dono sabe e o modelo não tem como adivinhar. */
export type Brief = {
  assunto: string;
  /* Quem assiste — muda tudo: o vocabulário, o exemplo, a objeção. */
  publico: string;
  /* A TESE. Sem ela o modelo escreve "sobre" o assunto, e escrever "sobre" é o que sai fraco. */
  angulo: string;
  /* O que a pessoa faz no fim. Um CTA vago vira "comenta aí". */
  cta: string;
};

export type RoteiroGerado = {
  titulo: string;
  roteiro: string;
  termos: string[];
  /* Aberturas alternativas: o gancho é o que decide o vídeo, e uma opção só é pouco. */
  ganchos: string[];
  modelo: string;
  palavras: number;
  segundos: number;
};

/* --------------------------------------------------------------------------
 * O ofício. Isto aqui é o que separa roteiro de texto de folheto.
 * -------------------------------------------------------------------------- */
const OFICIO = `COMO SE ESCREVE UM SHORT QUE SEGURA:

ABERTURA (as 3 primeiras frases decidem o vídeo)
- Comece DENTRO da tensão, não na preparação dela. A primeira frase é a afirmação mais afiada que você tem — nunca a introdução dela.
- A primeira frase precisa funcionar sozinha, para quem chegou sem contexto nenhum e ainda não viu imagem nenhuma.
- PROIBIDO abrir com: "Você sabia que", "Neste vídeo", "Hoje eu vou te mostrar", "Se você é X, esse vídeo é para você", "Fala pessoal", "Vamos falar sobre", "Existe uma coisa que". Tudo isso é aquecimento — o espectador vai embora durante o aquecimento.
- Ganchos que funcionam: contrariar uma crença que o público tem; começar pelo fim de uma história; um número específico e estranho; nomear em voz alta o erro que a pessoa comete; uma pergunta que ela não sabe responder sobre si mesma.

CORPO
- UMA ideia por vídeo. Se cabem duas, são dois vídeos. Vídeo com duas ideias não tem nenhuma.
- Abra um laço cedo e feche tarde: prometa uma resposta na abertura e entregue depois do meio.
- CONCRETO no lugar de abstrato, sempre. "Melhorar seus resultados" é abstrato. "O cliente liga, cai na caixa postal, e liga para o concorrente" é concreto. É o concreto que a pessoa lembra.
- Fale com "você", no presente. Uma pessoa falando com uma pessoa.
- Frases curtas. Varie o comprimento: depois de uma frase longa, uma de três palavras acerta.
- Toda frase tem que ganhar a próxima. Frase que só anuncia o que vem a seguir: corte.
- Nomeie o adversário: a crença errada, o conselho ruim, o jeito que todo mundo faz. Derrubar algo específico prende mais do que defender algo genérico.
- PROIBIDO enchimento: "nos dias de hoje", "cada vez mais", "de forma eficiente", "otimizar seus resultados", "revolucionar", "não é mesmo?", "e aí está", "é importante ressaltar".

FIM
- O CTA é UMA frase, direta, colada no que acabou de ser dito. Nada de "curte, comenta e compartilha".
- Termine NO CTA. Não escreva nada depois dele.

VOZ
- Escreva para ser LIDO EM VOZ ALTA. Português falado do Brasil: contração natural, ritmo de conversa. Nada de linguagem escrita formal.
- Não invente estatística, número, data, estudo nem caso real. Sem dado verdadeiro na mão, fale em termos gerais — o número inventado é o que destrói a confiança.

O TEXTO
- Escreva APENAS o que será narrado. Sem marcação de cena, sem "[música]", sem indicação de tempo, sem emoji, sem título de seção, sem nome de locutor — tudo isso seria lido em voz alta pela narração.`;

const SAIDA_JSON = `TERMOS DE BUSCA: 4 a 6 palavras EM INGLÊS para achar clipes de banco de imagens que ilustrem o vídeo. Palavras únicas, concretas e comuns ("office", "laptop", "handshake", "city"). Expressão longa não traz resultado.

TÍTULO: uma linha.

Responda APENAS com JSON válido, sem markdown:
{"titulo":"...","roteiro":"texto corrido da narração","termos":["office","laptop"]}`;

const SYSTEM_ESCREVER = `Você é roteirista de vídeos curtos (Shorts/Reels/TikTok) em português do Brasil, para narração em off. Você escreve para quem rola o feed com o dedo no ar.

Você recebe uma FÓRMULA extraída de vídeos que viralizaram e um BRIEFING. Use a fórmula como MECÂNICA — a estrutura, o tipo de gancho, o ritmo, o momento do CTA. O conteúdo é 100% original: é proibido reaproveitar frases dos vídeos analisados.

${OFICIO}

${SAIDA_JSON}`;

/*
 * A segunda passada. É aqui que o roteiro deixa de ser "ok" e fica bom:
 * o modelo lê o próprio texto com olho de editor, sem a pressão de inventar,
 * e a régua é uma lista de perguntas objetivas — não "melhore".
 */
const SYSTEM_EDITOR = `Você é editor de roteiro de vídeo curto em português do Brasil. Recebe um RASCUNHO e devolve a versão final, melhor.

Passe o rascunho por esta régua, na ordem, e conserte o que falhar:

1. PRIMEIRA FRASE: funciona sozinha, sem contexto e sem imagem? É a afirmação mais afiada do roteiro, ou é só a preparação dela? Se for preparação, jogue fora a preparação e comece na afirmação.
2. ENCHIMENTO: existe alguma frase que dá para apagar sem perder nada? Apague. Frase que só anuncia o que vem depois: apague.
3. ABSTRATO: toda afirmação genérica vira imagem concreta — cena, objeto, número, fala de alguém. Se não dá para ver ou ouvir, reescreva.
4. CLICHÊ: "nos dias de hoje", "cada vez mais", "de forma eficiente", "otimizar resultados", "revolucionar", "não é mesmo?" — fora.
5. UMA IDEIA: se o roteiro defende duas coisas, escolha a mais forte e corte a outra inteira. O espaço que sobrar aprofunda a que ficou.
6. RITMO: frases longas seguidas cansam. Quebre. Depois de uma frase longa, ponha uma curta.
7. FIM: termina no CTA, em uma frase, colada no argumento? Nada pode vir depois dele.
8. TAMANHO: o texto final tem que ficar dentro da faixa de palavras pedida. Curto demais é vídeo raso; longo demais é narração atropelada. Ajuste até entrar na faixa.
9. INVENÇÃO: número, data, estudo ou caso que o rascunho inventou — tire ou troque por afirmação geral.

Depois, escreva 3 ABERTURAS ALTERNATIVAS: 3 versões diferentes só da primeira frase (ou das duas primeiras), cada uma com um mecanismo diferente de gancho. Elas têm que encaixar no mesmo roteiro.

Responda APENAS com JSON válido, sem markdown:
{"titulo":"...","roteiro":"texto final corrido da narração","termos":["office","laptop"],"ganchos":["abertura 1","abertura 2","abertura 3"],"mudou":"em uma frase, o que você consertou"}`;

/* ------------------------------ ferramentas ------------------------------- */

function extrairJson(texto: string, modelo: string, parou: string | null): Record<string, unknown> {
  const inicio = texto.indexOf("{");
  const fim = texto.lastIndexOf("}");
  if (inicio === -1 || fim <= inicio) {
    // Erro que se explica: sem isto, "tente de novo" vira tentativa às cegas.
    throw new Error(
      parou === "max_tokens"
        ? `O modelo ${modelo} cortou a resposta no meio — tente uma duração menor.`
        : texto.trim()
          ? `O modelo ${modelo} respondeu sem JSON: “${texto.trim().slice(0, 160)}…”`
          : `O modelo ${modelo} devolveu resposta vazia (parada: ${parou ?? "?"}). Tente de novo ou troque o modelo do roteiro.`,
    );
  }
  try {
    return JSON.parse(texto.slice(inicio, fim + 1)) as Record<string, unknown>;
  } catch {
    throw new Error(
      parou === "max_tokens"
        ? `O modelo ${modelo} cortou a resposta no meio — tente uma duração menor.`
        : `O JSON do modelo ${modelo} veio quebrado. Tente de novo.`,
    );
  }
}

function limparTermos(bruto: unknown): string[] {
  const termos = (Array.isArray(bruto) ? bruto : [])
    .map((t) => String(t).trim().toLowerCase())
    .filter((t) => t.length > 1 && /^[a-z0-9 ]+$/.test(t))
    .slice(0, 6);
  // Sem termos válidos o MPT tentaria inventá-los e falharia; este mínimo
  // genérico garante que a renderização acontece.
  return termos.length > 0 ? termos : ["business", "office", "people", "city"];
}

/*
 * O texto que sai do modelo às vezes traz o resto do teatro: aspas em volta
 * de tudo, "NARRADOR:", um "[gancho]" no começo de linha. Cada um desses
 * seria LIDO EM VOZ ALTA pela narração.
 */
function limparNarracao(texto: string): string {
  return texto
    .replace(/\[[^\]]{0,60}\]/g, " ")
    .replace(/^\s*(narrador|locutor|voz\s*em\s*off|gancho|cta)\s*:\s*/gim, "")
    .replace(/^\s*\(\s*[^)]{0,60}\s*\)\s*$/gim, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function faixa(segundos: number): { min: number; max: number; alvo: number } {
  const alvo = palavrasAlvo(segundos);
  return { alvo, min: Math.round(alvo * 0.85), max: Math.round(alvo * 1.15) };
}

function textoDoBrief(b: Brief, segundos: number): string {
  const { alvo, min, max } = faixa(segundos);
  return `BRIEFING

ASSUNTO: ${b.assunto}
PÚBLICO (quem está assistindo): ${b.publico.trim() || "não especificado — escreva para quem tem o problema do assunto, sem nomear profissão"}
ÂNGULO (a tese que o vídeo defende): ${b.angulo.trim() || "escolha a tese mais forte e menos óbvia dentro do assunto, e defenda essa"}
O QUE PEDIR NO FIM: ${b.cta.trim() || "uma ação simples e imediata, coerente com o que foi dito"}

DURAÇÃO: ${segundos} segundos de narração. Isso é ${alvo} palavras — escreva entre ${min} e ${max} palavras. Menos que ${min} deixa o vídeo com buraco; mais que ${max} atropela a narração.`;
}

/* -------------------------------- passada 2 -------------------------------- */

async function editar(
  rascunho: { titulo: string; roteiro: string; termos: string[] },
  brief: Brief,
  segundos: number,
): Promise<RoteiroGerado> {
  const { alvo, min, max } = faixa(segundos);
  const atual = contarPalavras(rascunho.roteiro);
  const corpo = `${textoDoBrief(brief, segundos)}

RASCUNHO (título): ${rascunho.titulo}

RASCUNHO (narração) — ${atual} palavras, alvo ${alvo} (faixa ${min}–${max}):
${rascunho.roteiro}

TERMOS de busca do rascunho: ${rascunho.termos.join(", ")}`;

  const r = await chamarLLM("roteiro", SYSTEM_EDITOR, corpo, 8000, { pensar: true });
  const bruto = extrairJson(r.texto, r.modelo, r.parou);

  const roteiro = limparNarracao(String(bruto.roteiro ?? ""));
  // Editor que devolve menos texto do que o rascunho tinha de bom já
  // aconteceu; se a versão "final" veio quebrada, o rascunho vale mais.
  const final = roteiro.length >= 60 ? roteiro : limparNarracao(rascunho.roteiro);

  const ganchos = (Array.isArray(bruto.ganchos) ? bruto.ganchos : [])
    .map((g) => limparNarracao(String(g)))
    .filter((g) => g.length > 10 && g.length < 400)
    .slice(0, 3);

  return {
    titulo: String(bruto.titulo ?? rascunho.titulo).trim().slice(0, 200),
    roteiro: final,
    termos: limparTermos(bruto.termos ?? rascunho.termos),
    ganchos,
    modelo: r.modelo,
    palavras: contarPalavras(final),
    segundos: segundosDoTexto(final),
  };
}

/* ------------------------- caminho 1: pela fórmula ------------------------- */

export async function escreverRoteiro(
  brief: Brief,
  formula: Formula,
  duracaoAlvoS: number,
): Promise<RoteiroGerado> {
  const corpo = `${textoDoBrief(brief, duracaoAlvoS)}

FÓRMULA a seguir (mecânica, não conteúdo):
${JSON.stringify(formula, null, 2)}`;

  const r = await chamarLLM("roteiro", SYSTEM_ESCREVER, corpo, 8000, { pensar: true });
  const bruto = extrairJson(r.texto, r.modelo, r.parou);

  const roteiro = limparNarracao(String(bruto.roteiro ?? ""));
  if (roteiro.length < 60) throw new Error("O roteiro veio curto demais — tente de novo.");

  return editar(
    {
      titulo: String(bruto.titulo ?? brief.assunto).trim().slice(0, 200),
      roteiro,
      termos: limparTermos(bruto.termos),
    },
    brief,
    duracaoAlvoS,
  );
}

/* --------------------------- caminho 2: do zero --------------------------- */

/*
 * Sem garimpo, sem fórmula, sem vídeo de ninguém: você diz o assunto e sai
 * o roteiro.
 *
 * Existe porque a maior parte das ideias não nasce de um vídeo que estourou
 * — nasce de uma dúvida que o cliente acabou de mandar no WhatsApp. Obrigar
 * essa ideia a passar pelo YouTube era caminho longo à toa.
 *
 * Sem fórmula para copiar a mecânica, o próprio modelo escolhe a estrutura
 * — por isso o prompt manda escolher UMA e dizer qual foi: estrutura
 * escolhida de propósito é o que separa isto de "texto sobre um tema".
 */
const SYSTEM_ZERO = `Você é roteirista de vídeos curtos (Shorts/Reels/TikTok) em português do Brasil, para narração em off. Você escreve para quem rola o feed com o dedo no ar.

Você recebe um BRIEFING e escreve o roteiro. Não há fórmula pronta: a estrutura é escolha sua.

ANTES DE ESCREVER, decida em silêncio:
- Qual é a ÚNICA ideia do vídeo. Escreva a tese em uma frase para você mesmo, e não escreva nada que não sirva a ela.
- Qual crença errada do público você vai derrubar. Vídeo que só informa não segura; vídeo que corrige alguém segura.
- Qual estrutura serve melhor a esta ideia. Escolha UMA e siga até o fim:
  · problema → por que o jeito comum falha → o jeito certo → CTA
  · afirmação polêmica → prova → o que fazer → CTA
  · erro que quase todo mundo comete → o custo real dele → correção → CTA
  · história curta de um caso → a virada → a lição → CTA
  · pergunta que a pessoa não sabe responder sobre si → resposta → CTA
  · antes/depois → o que mudou no meio → CTA

${OFICIO}

${SAIDA_JSON}`;

export async function escreverDoZero(brief: Brief, duracaoAlvoS: number): Promise<RoteiroGerado> {
  const r = await chamarLLM("roteiro", SYSTEM_ZERO, textoDoBrief(brief, duracaoAlvoS), 8000, {
    pensar: true,
  });
  const bruto = extrairJson(r.texto, r.modelo, r.parou);

  const roteiro = limparNarracao(String(bruto.roteiro ?? ""));
  if (roteiro.length < 60) throw new Error("O roteiro veio curto demais — tente de novo.");

  return editar(
    {
      titulo: String(bruto.titulo ?? brief.assunto).trim().slice(0, 200),
      roteiro,
      termos: limparTermos(bruto.termos),
    },
    brief,
    duracaoAlvoS,
  );
}

/* ------------------- caminho 3: o texto já é seu, colado ------------------- */

/*
 * Você escreveu, a máquina só monta.
 *
 * Aqui a IA NÃO reescreve nada — mexer no texto de alguém que já sabe o que
 * quer dizer é estragar. Ela só olha o texto e devolve o que o
 * MoneyPrinterTurbo precisa e que ninguém quer digitar: um título e as
 * palavras em inglês para buscar os clipes.
 */
const SYSTEM_TERMOS = `Você lê um roteiro de vídeo curto em português e devolve apenas os metadados para montá-lo. NÃO reescreva, não comente e não corrija o roteiro.

TÍTULO: uma linha que descreva o vídeo.
TERMOS: 4 a 6 palavras EM INGLÊS para buscar clipes de banco de imagens que ilustrem este roteiro. Palavras únicas, concretas e comuns ("office", "laptop", "handshake", "city").

Responda APENAS com JSON válido, sem markdown:
{"titulo":"...","termos":["office","laptop"]}`;

export async function metadadosDoRoteiro(
  texto: string,
): Promise<{ titulo: string; termos: string[] }> {
  const r = await chamarLLM("roteiro", SYSTEM_TERMOS, texto.slice(0, 8000), 500);
  try {
    const bruto = extrairJson(r.texto, r.modelo, r.parou);
    return {
      titulo: String(bruto.titulo ?? "").trim().slice(0, 200) || texto.trim().slice(0, 60),
      termos: limparTermos(bruto.termos),
    };
  } catch {
    /*
     * O roteiro é do dono e já está pronto: falha em achar título não pode
     * impedir o vídeo. Cai no genérico — ele edita os termos na aprovação.
     */
    return { titulo: texto.trim().slice(0, 60), termos: limparTermos(null) };
  }
}

/* ---------------------- caminho 4: adaptando UM vídeo ---------------------- */

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

Recebe a TRANSCRIÇÃO de um vídeo que viralizou e um BRIEFING. Seu trabalho é escrever um roteiro que SIGA DE PERTO o vídeo original: a mesma ordem de argumentos, os mesmos momentos de virada, o mesmo tipo de gancho e o mesmo ritmo.

REGRA INEGOCIÁVEL: escreva com PALAVRAS PRÓPRIAS. É proibido reaproveitar frases da transcrição — nenhuma sequência de 6 palavras seguidas pode ser igual à do original. A estrutura é o que se aproveita; o texto é seu.

Se o ASSUNTO for diferente do vídeo original, transponha a mecânica para o novo assunto. Se for igual ou vazio, escreva a SUA versão do mesmo tema.

Antes de escrever, identifique em silêncio: qual é o gancho do original, quais são as viradas, onde ele entrega a promessa e como ele fecha. Depois escreva o seu com a mesma engenharia.

${OFICIO}

${SAIDA_JSON}`;

export async function adaptarRoteiro(
  transcricao: string,
  brief: Brief,
  duracaoAlvoS: number,
  tituloOriginal: string,
): Promise<RoteiroGerado> {
  const briefUsado: Brief = {
    ...brief,
    assunto: brief.assunto.trim() || "o mesmo tema do original, na sua própria versão",
  };
  const corpo = `${textoDoBrief(briefUsado, duracaoAlvoS)}

VÍDEO ORIGINAL (título): ${tituloOriginal}

TRANSCRIÇÃO do original (matéria de análise — não copie frases):
${transcricao.slice(0, 10_000)}`;

  const r = await chamarLLM("roteiro", SYSTEM_ADAPTAR, corpo, 8000, { pensar: true });
  const bruto = extrairJson(r.texto, r.modelo, r.parou);

  const roteiro = limparNarracao(String(bruto.roteiro ?? ""));
  if (roteiro.length < 60) throw new Error("O roteiro veio curto demais — tente de novo.");

  return editar(
    {
      titulo: String(bruto.titulo ?? (brief.assunto || tituloOriginal)).trim().slice(0, 200),
      roteiro,
      termos: limparTermos(bruto.termos),
    },
    briefUsado,
    duracaoAlvoS,
  );
}
