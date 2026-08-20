import "server-only";

import { chamarLLM } from "./llm";

/*
 * A dissecação: transforma vídeos que estouraram numa FÓRMULA reutilizável.
 *
 * Regra de direitos autorais embutida no prompt e no formato: a saída
 * descreve PADRÕES (gancho, estrutura, promessa, ritmo) — nunca reproduz o
 * texto alheio. A transcrição entra como matéria de análise e não sai do
 * outro lado; roteiro é escrito depois, do zero, só com a fórmula.
 *
 * O plano B mora aqui também: sem transcrição, a análise segue com título,
 * canal, números e duração — mais rasa, ainda útil (padrão de título e
 * promessa saem bem só do título + thumbnail descrita).
 */

export type Formula = {
  gancho: string;
  estrutura: { bloco: string; funcao: string; segundos: string }[];
  promessa: string;
  padrao_titulo: string;
  ritmo: string;
  cta: { momento: string; como: string };
  observacoes: string;
};

export type EntradaDissecacao = {
  titulo: string | null;
  canal: string | null;
  views: number | null;
  score_outlier: number | null;
  views_por_dia: number | null;
  duracao_s: number | null;
  transcricao: string | null;
};

const SYSTEM = `Você analisa vídeos curtos virais (YouTube Shorts/TikTok) e extrai a FÓRMULA estrutural deles, para que um roteirista escreva depois um vídeo 100% original sobre outro conteúdo usando a mesma mecânica.

REGRAS:
- Descreva PADRÕES e MECÂNICAS. É proibido copiar frases das transcrições: nada de citações literais na saída.
- Quando houver mais de um vídeo, extraia o padrão COMUM entre eles (o que se repete é a fórmula; o que só um faz é ruído).
- Vídeos sem transcrição: analise pelo título, números e duração — diga na observação que a análise foi parcial.
- Seja concreto e acionável: "abre com pergunta que ataca uma crença comum, resposta só aos 40s" serve; "tem um bom gancho" não serve.

Responda APENAS com JSON válido, sem markdown, neste formato:
{"gancho":"como os primeiros 3-15s prendem","estrutura":[{"bloco":"nome","funcao":"o que faz","segundos":"0-15"}],"promessa":"o que o vídeo promete entregar","padrao_titulo":"a mecânica do título","ritmo":"cortes/velocidade/padrão de fala","cta":{"momento":"quando","como":"de que jeito"},"observacoes":"o que mais importa replicar"}`;

/*
 * Quanto de transcrição vai por vídeo. Cinco transcrições de 6.000
 * caracteres é entrada cara e resposta arriscada — e o PADRÃO COMUM, que é
 * o que interessa, já aparece em menos texto.
 */
function limiteDeTranscricao(quantos: number): number {
  if (quantos <= 1) return 8000;
  if (quantos <= 3) return 4000;
  return 2500;
}

function resumirAchado(a: EntradaDissecacao, i: number, limite = 6000): string {
  const linhas = [
    `VÍDEO ${i + 1}: "${a.titulo ?? "?"}" — canal ${a.canal ?? "?"}`,
    `  ${a.views?.toLocaleString("pt-BR") ?? "?"} views · score de outlier ${a.score_outlier ?? "?"}x a média do canal · ${a.views_por_dia?.toLocaleString("pt-BR") ?? "?"} views/dia · ${a.duracao_s ?? "?"}s`,
  ];
  linhas.push(
    a.transcricao
      ? `  TRANSCRIÇÃO: ${a.transcricao.slice(0, limite)}`
      : "  (sem transcrição — analise pelo título e números)",
  );
  return linhas.join("\n");
}

export async function dissecar(
  achados: EntradaDissecacao[],
  tema: string,
): Promise<{ formula: Formula; modelo: string }> {
  const limite = limiteDeTranscricao(achados.length);
  const corpo = `TEMA pesquisado: ${tema}\n\n${achados
    .map((a, i) => resumirAchado(a, i, limite))
    .join("\n\n")}`;
  /*
   * Espaço de sobra na resposta: a fórmula tem uma lista de blocos, e com
   * 1800 tokens ela chegava CORTADA no meio do JSON — que aparecia para o
   * dono como "a IA não devolveu JSON", escondendo a causa real.
   */
  const r = await chamarLLM("dissecacao", SYSTEM, corpo, 4000);

  const inicio = r.texto.indexOf("{");
  const fim = r.texto.lastIndexOf("}");
  if (inicio === -1 || fim <= inicio) {
    // Erro que se explica: sem isto, "tente de novo" vira tentativa às cegas.
    if (r.parou === "max_tokens") {
      throw new Error(
        `O modelo ${r.modelo} cortou a resposta no meio. Use menos vídeos por fórmula, ou um modelo com resposta maior.`,
      );
    }
    throw new Error(
      r.texto.trim()
        ? `O modelo ${r.modelo} respondeu sem JSON: “${r.texto.trim().slice(0, 160)}…”`
        : `O modelo ${r.modelo} devolveu resposta vazia (parada: ${r.parou ?? "?"}). Tente de novo ou troque o modelo da dissecação.`,
    );
  }

  let bruto: Partial<Formula>;
  try {
    bruto = JSON.parse(r.texto.slice(inicio, fim + 1)) as Partial<Formula>;
  } catch {
    throw new Error(
      r.parou === "max_tokens"
        ? `O modelo ${r.modelo} cortou a resposta no meio — use menos vídeos por fórmula.`
        : `O JSON do modelo ${r.modelo} veio quebrado. Tente de novo.`,
    );
  }
  if (!bruto.gancho || !Array.isArray(bruto.estrutura) || !bruto.promessa) {
    throw new Error("A fórmula veio incompleta — tente de novo (ou troque o modelo da dissecação).");
  }

  return {
    formula: {
      gancho: String(bruto.gancho),
      estrutura: bruto.estrutura.map((b) => ({
        bloco: String(b?.bloco ?? ""),
        funcao: String(b?.funcao ?? ""),
        segundos: String(b?.segundos ?? ""),
      })),
      promessa: String(bruto.promessa),
      padrao_titulo: String(bruto.padrao_titulo ?? ""),
      ritmo: String(bruto.ritmo ?? ""),
      cta: {
        momento: String(bruto.cta?.momento ?? ""),
        como: String(bruto.cta?.como ?? ""),
      },
      observacoes: String(bruto.observacoes ?? ""),
    },
    modelo: r.modelo,
  };
}
