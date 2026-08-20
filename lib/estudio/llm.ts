import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { chaveAnthropicDaPlataforma } from "@/lib/creditos/conta";

/*
 * O LLM do Estúdio, configurável por TAREFA.
 *
 * O dono tem chave da Anthropic e da OpenAI e quer decidir, com número na
 * mão, qual modelo faz o quê: um barato para a dissecação (JSON estruturado)
 * e um bom para o roteiro (onde a escrita importa). A escolha fica em
 * config_sistema:
 *
 *   estudio_llm_dissecacao = "anthropic:claude-sonnet-5"   (padrão)
 *   estudio_llm_roteiro    = "anthropic:claude-opus-5"     (padrão)
 *
 * Formato "provedor:modelo", editável na própria tela do Estúdio. As chaves
 * são as que a plataforma JÁ usa (ANTHROPIC_API_KEY / OPENAI_API_KEY ou as
 * gravadas em config_sistema) — nenhum sistema paralelo de credencial.
 *
 * Ferramenta interna do admin: o uso NÃO passa pelo cobrar() — a fatura é a
 * do próprio dono, direto no provedor.
 */

export type TarefaLLM = "dissecacao" | "roteiro";

const PADRAO: Record<TarefaLLM, string> = {
  dissecacao: "anthropic:claude-sonnet-5",
  roteiro: "anthropic:claude-opus-5",
};

export async function modeloDaTarefa(tarefa: TarefaLLM): Promise<{ provedor: string; modelo: string }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("config_sistema")
    .select("valor")
    .eq("chave", `estudio_llm_${tarefa}`)
    .maybeSingle();
  const bruto = ((data as { valor: string } | null)?.valor ?? "").trim() || PADRAO[tarefa];
  const [provedor, ...resto] = bruto.split(":");
  const modelo = resto.join(":").trim();
  if ((provedor !== "anthropic" && provedor !== "openai") || !modelo) {
    const [p, m] = PADRAO[tarefa].split(":");
    return { provedor: p, modelo: m };
  }
  return { provedor, modelo };
}

export async function salvarModeloDaTarefa(tarefa: TarefaLLM, valor: string): Promise<string | null> {
  const limpo = valor.trim().toLowerCase();
  if (!/^(anthropic|openai):[a-z0-9._-]{3,60}$/.test(limpo)) {
    return 'Use o formato provedor:modelo — ex.: "anthropic:claude-haiku-4-5" ou "openai:gpt-4o-mini".';
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("config_sistema")
    .upsert({ chave: `estudio_llm_${tarefa}`, valor: limpo }, { onConflict: "chave" });
  return error ? error.message : null;
}

async function chaveOpenai(): Promise<string | null> {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const admin = createAdminClient();
  const { data } = await admin
    .from("config_sistema")
    .select("valor")
    .eq("chave", "openai_api_key")
    .maybeSingle();
  return (data as { valor: string } | null)?.valor?.trim() || null;
}

export type RespostaLLM = {
  texto: string;
  modelo: string;
  entrada: number;
  saida: number;
  /* "max_tokens" quando a resposta foi CORTADA — a causa mais comum de JSON pela metade. */
  parou: string | null;
};

/*
 * O texto de uma resposta pode vir em VÁRIOS blocos, e o primeiro nem sempre
 * é texto (um bloco de raciocínio pode vir na frente). Ler só content[0]
 * devolvia string vazia e o erro saía como "a IA não devolveu JSON" — culpa
 * nossa, com cara de culpa do modelo.
 */
export function textoDaResposta(blocos: { type: string; text?: string }[]): string {
  return blocos
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n")
    .trim();
}

/*
 * Uma chamada, dois provedores. A OpenAI vai por fetch puro (o projeto não
 * tem o SDK dela e uma chamada de chat não justifica a dependência).
 */
export async function chamarLLM(
  tarefa: TarefaLLM,
  system: string,
  usuario: string,
  maxTokens = 2000,
): Promise<RespostaLLM> {
  const { provedor, modelo } = await modeloDaTarefa(tarefa);

  if (provedor === "openai") {
    const chave = await chaveOpenai();
    if (!chave) throw new Error("Sem chave da OpenAI (OPENAI_API_KEY na Vercel ou openai_api_key em config_sistema).");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${chave}` },
      body: JSON.stringify({
        model: modelo,
        max_completion_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: usuario },
        ],
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      const corpo = await res.text().catch(() => "");
      throw new Error(`OpenAI (${modelo}) respondeu ${res.status}: ${corpo.slice(0, 200)}`);
    }
    const d = (await res.json()) as {
      choices?: { message?: { content?: string }; finish_reason?: string }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    return {
      texto: d.choices?.[0]?.message?.content ?? "",
      modelo: `openai:${modelo}`,
      entrada: d.usage?.prompt_tokens ?? 0,
      saida: d.usage?.completion_tokens ?? 0,
      parou: d.choices?.[0]?.finish_reason === "length" ? "max_tokens" : null,
    };
  }

  const chave = await chaveAnthropicDaPlataforma();
  if (!chave) throw new Error("Sem chave da Anthropic (ANTHROPIC_API_KEY na Vercel).");
  const client = new Anthropic({ apiKey: chave });
  const resposta = await client.messages.create({
    model: modelo,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: usuario }],
  });
  return {
    texto: textoDaResposta(resposta.content as { type: string; text?: string }[]),
    modelo: `anthropic:${modelo}`,
    entrada: resposta.usage.input_tokens ?? 0,
    saida: resposta.usage.output_tokens ?? 0,
    parou: resposta.stop_reason ?? null,
  };
}
