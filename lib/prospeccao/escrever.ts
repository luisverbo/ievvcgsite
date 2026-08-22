import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { textoDaResposta } from "@/lib/estudio/llm";
import { contaDaOrg, cobrar } from "@/lib/creditos/conta";
import { ramoDe } from "./mensagem";
import { ofertaDaOrg } from "./oferta";
import type { ProspectoRow } from "./tipos";

/*
 * Mensagens com cérebro: em vez de um modelo com variações, a IA escreve uma
 * mensagem DIFERENTE para cada lead — citando o que dá para saber daquele
 * negócio (ramo, bairro, avaliações, a bio do Instagram).
 *
 * Por que vale o custo (fração de centavo por mensagem):
 *   - mensagem única não tem assinatura de disparo — é a melhor proteção do
 *     número que existe, melhor que qualquer [Oi|Olá];
 *   - citar o negócio da pessoa é o que separa "spam" de "alguém olhou meu
 *     trabalho antes de falar comigo".
 *
 * Regras fixas, fora do alcance do briefing: a primeira mensagem NÃO leva
 * link (pede permissão), não fala preço e só usa fatos fornecidos — a IA
 * não pode inventar elogio sobre dado que não existe.
 */

const MODELO_ESCRITOR = "claude-haiku-4-5";

// ~US$0,002 por mensagem — o número mostrado na tela antes de gastar.
export const CUSTO_ESTIMADO_MSG_MICRO = 2_000;

// Quantos leads por chamada: o suficiente para diluir o prompt fixo, pouco
// o bastante para a resposta não estourar e o JSON voltar inteiro.
const POR_CHAMADA = 12;

/*
 * O prompt muda com o que se vende:
 *   site    — o produto original: a permissão pedida no fim é para mandar o
 *             link da demonstração já criada para aquela empresa;
 *   propria — modo Prospector (seguro, plano de saúde, consórcio…): não há
 *             nada pronto para mostrar, então o fim honesto é pedir permissão
 *             para explicar em duas linhas.
 * As regras de proteção (sem link, sem preço, só fatos reais) valem nos dois.
 */
function montarSystem(oferta: { tipo: "site" | "propria"; resumo: string }): string {
  const oQue =
    oferta.tipo === "propria"
      ? `oferecendo ${oferta.resumo || "o produto/serviço descrito no briefing"}`
      : "oferecendo criação de site";
  const cta =
    oferta.tipo === "propria"
      ? "A mensagem termina pedindo permissão para explicar em poucas linhas como funciona — sem empurrar reunião nem ligação."
      : "A mensagem termina pedindo permissão para mandar o link de uma demonstração já criada para aquela empresa.";

  return `Você escreve mensagens de primeira abordagem no WhatsApp para donos de pequenos negócios brasileiros, ${oQue}. Recebe um briefing de quem oferece e uma lista de leads com os dados reais de cada um.

REGRAS INEGOCIÁVEIS:
- Uma mensagem POR lead, todas diferentes entre si (variação real de abertura e estrutura, não sinônimos).
- Curta: 3 a 6 linhas de WhatsApp. Tom humano, direto, sem formalidade engessada e sem exagero de vendedor.
- NUNCA inclua link, preço, valor ou promessa de prazo. ${cta}
- Use SOMENTE os fatos fornecidos do lead. Sem dado, sem elogio inventado.
- Cite o nome da empresa naturalmente. Se houver avaliações relevantes (5 ou mais), pode mencionar como elogio honesto.
- Assine com o nome de quem envia, do jeito que uma pessoa assina ("— Luis" ou dentro da frase), sem cargo inventado.
- Português do Brasil. Pode usar no máximo 1 emoji por mensagem, ou nenhum.

RESPONDA APENAS com JSON válido, sem markdown: [{"id":"...","msg":"..."}] — um item por lead, na mesma ordem.`;
}

type LeadParaIA = {
  id: string;
  empresa: string;
  ramo: string;
  bairro?: string;
  avaliacoes?: number;
  nota?: number;
  instagram_bio?: string;
};

function resumirLead(p: ProspectoRow): LeadParaIA {
  const bairro = p.endereco?.split("·").map((s) => s.trim())[1] || p.local_busca?.split(",")[0]?.trim();
  return {
    id: p.id,
    empresa: p.nome,
    ramo: ramoDe(p),
    ...(bairro ? { bairro } : {}),
    ...((p.avaliacoes ?? 0) >= 5 ? { avaliacoes: p.avaliacoes!, ...(p.nota_media ? { nota: p.nota_media } : {}) } : {}),
    ...(p.ig_bio ? { instagram_bio: p.ig_bio.slice(0, 160) } : {}),
  };
}

// Tolerante com o que os modelos adoram fazer: cercar o JSON de conversa.
function extrairJson(bruto: string): { id: string; msg: string }[] {
  const inicio = bruto.indexOf("[");
  const fim = bruto.lastIndexOf("]");
  if (inicio === -1 || fim <= inicio) return [];
  try {
    const arr = JSON.parse(bruto.slice(inicio, fim + 1)) as { id?: unknown; msg?: unknown }[];
    return arr
      .filter((x) => typeof x?.id === "string" && typeof x?.msg === "string" && (x.msg as string).trim())
      .map((x) => ({ id: x.id as string, msg: (x.msg as string).trim().slice(0, 900) }));
  } catch {
    return [];
  }
}

/*
 * Escreve as mensagens. Devolve o que conseguiu — quem ficou de fora (chamada
 * que falhou, JSON capenga) simplesmente não aparece no mapa, e o chamador
 * decide o plano B (o modelo tradicional). Lança erro só quando NADA é
 * possível: sem chave de IA nenhuma.
 */
export async function escreverMensagens(
  orgId: string,
  briefing: string,
  remetente: string,
  prospectos: ProspectoRow[],
): Promise<Map<string, string>> {
  const textos = new Map<string, string>();
  if (prospectos.length === 0) return textos;

  const conta = await contaDaOrg(orgId);
  if (!conta.anthropic) {
    throw new Error("Sem crédito de IA disponível — a IA não pode escrever as mensagens agora.");
  }
  /*
   * Teto de verdade: sem saldo, NÃO escreve.
   *
   * Faltava esta linha. contaDaOrg devolve a chave da plataforma mesmo com
   * saldo zerado, e cobrar() só debita — então uma conta no vermelho seguia
   * gastando na nossa fatura. Quem usa chave própria não passa por aqui: lá
   * o custo é dele, direto no provedor.
   */
  if (conta.fonte === "plataforma" && conta.saldo <= 0) {
    throw new Error(
      "O crédito de IA deste mês acabou. As mensagens continuam saindo pelo seu modelo de texto — ou espere a cota renovar.",
    );
  }
  const client = new Anthropic({ apiKey: conta.anthropic });
  const system = montarSystem(await ofertaDaOrg(orgId));

  const lotes: ProspectoRow[][] = [];
  for (let i = 0; i < prospectos.length; i += POR_CHAMADA) {
    lotes.push(prospectos.slice(i, i + POR_CHAMADA));
  }

  await Promise.all(
    lotes.map(async (lote) => {
      try {
        const resposta = await client.messages.create({
          model: MODELO_ESCRITOR,
          max_tokens: 300 * lote.length,
          system,
          messages: [
            {
              role: "user",
              content: `BRIEFING de quem envia (nome: ${remetente}):\n${briefing}\n\nLEADS:\n${JSON.stringify(
                lote.map(resumirLead),
              )}`,
            },
          ],
        });

        await cobrar({
          conta,
          modelo: MODELO_ESCRITOR,
          uso: {
            entrada: resposta.usage.input_tokens ?? 0,
            saida: resposta.usage.output_tokens ?? 0,
          },
          descricao: `Mensagens de abordagem escritas pela IA (${lote.length} leads)`,
        });

        const bruto = textoDaResposta(resposta.content as { type: string; text?: string }[]);
        const ids = new Set(lote.map((p) => p.id));
        for (const item of extrairJson(bruto)) {
          if (ids.has(item.id)) textos.set(item.id, item.msg);
        }
      } catch (e) {
        // Um lote perdido não derruba os outros; esses leads caem no modelo.
        console.error("[escrever]", (e as Error).message);
      }
    }),
  );

  return textos;
}
