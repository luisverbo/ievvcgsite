import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";


// Integração com a Anthropic (Claude) para o construtor de páginas com IA.
// A chave fica em config_sistema (colada pelo dono no painel Admin) com
// fallback para a env ANTHROPIC_API_KEY. NUNCA vai para o navegador.

import { modeloValido } from "./modelos";
import { extrairHtml, extrairResumo } from "./extrair";

export { MODELOS_IA, MODELO_PADRAO, modeloValido } from "./modelos";

export async function getAnthropicKey(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("config_sistema")
    .select("valor")
    .eq("chave", "anthropic_api_key")
    .maybeSingle();
  const valor = (data as { valor: string } | null)?.valor?.trim();
  return valor || process.env.ANTHROPIC_API_KEY || null;
}

export async function salvarAnthropicKey(valor: string) {
  const admin = createAdminClient();
  await admin.from("config_sistema").upsert({
    chave: "anthropic_api_key",
    valor: valor.trim(),
    updated_at: new Date().toISOString(),
  });
}

/* ------------------------------- conversa -------------------------------- */

// Um anexo já convertido para base64 pelo navegador. Claude lê imagem e PDF
// nativamente — não precisamos extrair texto de nada.
export type Anexo = {
  tipo: "imagem" | "pdf";
  nome: string;
  media_type: string;
  data: string; // base64 puro (sem o prefixo data:)
};

export type MensagemChat = {
  papel: "user" | "assistant";
  conteudo: string;
  anexos?: Anexo[];
};

export const MEDIA_TYPES_IMAGEM = ["image/png", "image/jpeg", "image/webp", "image/gif"];

type BlocoUsuario = Anthropic.ContentBlockParam;

function blocosDaMensagem(msg: MensagemChat): BlocoUsuario[] {
  const blocos: BlocoUsuario[] = [];
  for (const anexo of msg.anexos ?? []) {
    if (anexo.tipo === "pdf") {
      blocos.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: anexo.data },
        title: anexo.nome,
      });
    } else if (MEDIA_TYPES_IMAGEM.includes(anexo.media_type)) {
      blocos.push({
        type: "image",
        source: {
          type: "base64",
          media_type: anexo.media_type as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
          data: anexo.data,
        },
      });
    }
  }
  blocos.push({ type: "text", text: msg.conteudo || "(sem texto)" });
  return blocos;
}

export type UsoIA = { entrada: number; saida: number; cacheGravado: number; cacheLido: number };

/*
 * Erro que já aconteceu DEPOIS de a IA trabalhar — recusa, corte por tamanho.
 * Esses tokens foram cobrados pela Anthropic de qualquer jeito, então o erro
 * carrega o consumo junto: não descontar seria pagar a conta do cliente.
 */
export class ErroIA extends Error {
  uso: UsoIA;
  constructor(mensagem: string, uso: UsoIA) {
    super(mensagem);
    this.name = "ErroIA";
    this.uso = uso;
  }
}

export type RespostaIA = {
  html: string | null;
  resumo: string;
  textoBruto: string;
  // Quanto custou de verdade. Sem isto o débito de crédito seria estimativa.
  uso: UsoIA;
};

/*
 * Manda a conversa para o Claude e devolve o HTML da página.
 *
 * Detalhes que importam:
 * - streaming é obrigatório com max_tokens alto (uma página inteira é longa);
 * - o system prompt vai marcado com cache_control: a cada mensagem do chat ele
 *   é reenviado igual, e o cache faz isso custar ~10% do preço;
 * - NÃO mandamos `thinking`: no Fable 5 o parâmetro só atrapalha (thinking é
 *   sempre ligado e `{type:"disabled"}` devolve 400) e no Opus 5 omitir já
 *   equivale ao modo adaptativo;
 * - NÃO usamos prefill do assistente: o Fable 5 não aceita.
 */
export async function conversarComIA(opcoes: {
  key: string;
  modelo: string;
  system: string;
  mensagens: MensagemChat[];
  htmlAtual?: string | null;
  onTexto?: (pedaco: string) => void;
  // Quanto a IA "pensa" antes de escrever. Baixo = mais rápido, e velocidade
  // aqui é requisito: a função tem 300s no total (Vercel).
  esforco?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<RespostaIA> {
  const client = new Anthropic({ apiKey: opcoes.key });

  const historico: Anthropic.MessageParam[] = opcoes.mensagens.map((m) =>
    m.papel === "assistant"
      ? { role: "assistant", content: m.conteudo }
      : { role: "user", content: blocosDaMensagem(m) },
  );

  // O HTML que está valendo entra como contexto na última mensagem do usuário,
  // não no system — assim o prefixo em cache continua idêntico entre as voltas.
  if (opcoes.htmlAtual) {
    const ultima = historico[historico.length - 1];
    if (ultima?.role === "user" && Array.isArray(ultima.content)) {
      ultima.content.unshift({
        type: "text",
        text: `HTML ATUAL DA PÁGINA (edite a partir dele e devolva o documento completo):\n\n${opcoes.htmlAtual}`,
      });
    }
  }

  const stream = client.messages.stream({
    model: modeloValido(opcoes.modelo),
    // Teto de segurança: uma página passa longe disto, e um documento que
    // crescesse sem limite estouraria o tempo da função antes de terminar.
    max_tokens: opcoes.maxTokens ?? 32000,
    output_config: { effort: opcoes.esforco ?? "medium" },
    system: [{ type: "text", text: opcoes.system, cache_control: { type: "ephemeral" } }],
    messages: historico,
  });

  let texto = "";
  for await (const evento of stream) {
    if (evento.type === "content_block_delta" && evento.delta.type === "text_delta") {
      texto += evento.delta.text;
      opcoes.onTexto?.(evento.delta.text);
    }
  }

  const final = await stream.finalMessage();
  const uso = {
    entrada: final.usage.input_tokens ?? 0,
    saida: final.usage.output_tokens ?? 0,
    cacheGravado: final.usage.cache_creation_input_tokens ?? 0,
    cacheLido: final.usage.cache_read_input_tokens ?? 0,
  };
  // Os modelos novos podem recusar por classificador de segurança; sem isto o
  // erro apareceria como "a IA não devolveu HTML", que confunde.
  if (final.stop_reason === "refusal") {
    throw new ErroIA("A IA recusou este pedido. Reescreva o prompt e tente de novo.", uso);
  }
  // Documento cortado no meio: melhor avisar do que salvar uma página quebrada.
  if (final.stop_reason === "max_tokens") {
    throw new ErroIA(
      "A página ficou longa demais e foi cortada. Peça algo mais enxuto (menos seções) e tente de novo.",
      uso,
    );
  }

  return { html: extrairHtml(texto), resumo: extrairResumo(texto), textoBruto: texto, uso };
}

export { extrairHtml, extrairResumo } from "./extrair";
