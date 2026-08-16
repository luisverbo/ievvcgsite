import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { contaDaOrg, cobrar } from "@/lib/creditos/conta";

/*
 * Classifica a resposta de um lead no WhatsApp.
 *
 * Cinco caixas, e cada uma dispara uma ação diferente:
 *
 *   interesse  quer ver → o Fechador pode preparar/enviar o site
 *   preco      perguntou valor → humano assume (preço é decisão de gente)
 *   duvida     não entendeu / quer saber mais → humano assume
 *   recusa     não quer → opt-out definitivo, nunca mais recebe nada
 *   outro      não dá para saber → só marca "respondeu"
 *
 * Duas camadas, na ordem certa:
 *
 * 1. Palavras inequívocas resolvem DE GRAÇA. "Não tenho interesse" não
 *    precisa de IA — e o opt-out não pode depender de ter crédito: respeitar
 *    a recusa é obrigação, não recurso premium.
 * 2. O resto vai para o modelo mais barato da casa (Haiku), com resposta de
 *    uma palavra. Custa fração de centavo e é debitado como qualquer uso.
 *
 * Errar aqui não derruba nada: na dúvida (sem chave, sem crédito, resposta
 * estranha da IA), devolve "outro" — o lead aparece como "respondeu" e o
 * humano decide. O erro seguro é sempre para o lado do humano.
 */

export type ClasseResposta = "interesse" | "preco" | "duvida" | "recusa" | "outro";

const MODELO_CLASSIFICADOR = "claude-haiku-4-5";

// Camada 1: o que se resolve com português, sem gastar nada.
function porPalavras(texto: string): ClasseResposta | null {
  const t = texto.toLowerCase();

  // Recusa primeiro: é a que tem obrigação legal de acertar.
  if (
    /(n[aã]o\s+(tenho|temos)\s+interesse|sem\s+interesse|n[aã]o\s+quero|me\s+(tira|tire|remova|remove)|para\s+de\s+(mandar|enviar)|n[aã]o\s+mand[ae]\s+mais|descadastr|sai\s+dessa\s+lista|spam|denunciar)/.test(
      t,
    )
  ) {
    return "recusa";
  }
  if (/(quanto\s+(custa|fica|sai|[eé])|qual\s+o?\s*(valor|pre[çc]o)|preço|orçamento|mensalidade\?)/.test(t)) {
    return "preco";
  }
  if (
    /^(sim|pode|pode\s+sim|claro|quero|quero\s+sim|manda|pode\s+mandar|envia|to\s+dentro|tô\s+dentro|bora|vamos|tenho\s+interesse|ok|opa)\b/.test(
      t.trim(),
    )
  ) {
    return "interesse";
  }
  return null;
}

export async function classificarResposta(
  orgId: string,
  texto: string,
): Promise<ClasseResposta> {
  const limpo = texto.trim().slice(0, 600);
  if (!limpo) return "outro";

  const rapida = porPalavras(limpo);
  if (rapida) return rapida;

  try {
    const conta = await contaDaOrg(orgId);
    if (!conta.anthropic) return "outro";
    const client = new Anthropic({ apiKey: conta.anthropic });

    const resposta = await client.messages.create({
      model: MODELO_CLASSIFICADOR,
      max_tokens: 8,
      system:
        "Você classifica a resposta de um comerciante brasileiro a uma oferta de criação de site enviada por WhatsApp. Responda APENAS UMA palavra dentre: interesse, preco, duvida, recusa, outro. interesse = quer ver/aceita receber; preco = pergunta valor; duvida = pede mais informação ou não entendeu; recusa = não quer / pede para parar; outro = nada disso.",
      messages: [{ role: "user", content: limpo }],
    });

    await cobrar({
      conta,
      modelo: MODELO_CLASSIFICADOR,
      uso: {
        entrada: resposta.usage.input_tokens ?? 0,
        saida: resposta.usage.output_tokens ?? 0,
      },
      descricao: "Classificação de resposta do WhatsApp",
    });

    const bruto = (resposta.content[0]?.type === "text" ? resposta.content[0].text : "")
      .trim()
      .toLowerCase();
    if (["interesse", "preco", "duvida", "recusa", "outro"].includes(bruto)) {
      return bruto as ClasseResposta;
    }
    return "outro";
  } catch {
    // Sem IA disponível, o lead ainda vira "respondeu" — só sem etiqueta fina.
    return "outro";
  }
}
