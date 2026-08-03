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

export type RespostaIA = { html: string | null; resumo: string; textoBruto: string };

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
    max_tokens: 64000,
    output_config: { effort: "high" },
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
  // Os modelos novos podem recusar por classificador de segurança; sem isto o
  // erro apareceria como "a IA não devolveu HTML", que confunde.
  if (final.stop_reason === "refusal") {
    throw new Error("A IA recusou este pedido. Reescreva o prompt e tente de novo.");
  }

  return { html: extrairHtml(texto), resumo: extrairResumo(texto), textoBruto: texto };
}

export { extrairHtml, extrairResumo } from "./extrair";
