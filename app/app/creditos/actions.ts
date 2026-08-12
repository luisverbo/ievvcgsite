"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMinhaOrg } from "@/lib/painel/queries";
import { cifrar, final4, temSegredo } from "@/lib/creditos/cripto";
import Anthropic from "@anthropic-ai/sdk";

export type ChaveState = { ok?: string; error?: string } | undefined;

/*
 * Salva a chave de API do próprio cliente.
 *
 * A chave é TESTADA antes de gravar. Sem isso o erro só apareceria lá na
 * frente, no meio de uma geração, e o cliente ia achar que o sistema quebrou
 * quando na verdade ele colou a chave errada.
 */
export async function salvarChavePropria(
  _prev: ChaveState,
  formData: FormData,
): Promise<ChaveState> {
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };
  if (!temSegredo()) {
    return { error: "O sistema ainda não está configurado para guardar chaves. Fale com o suporte." };
  }

  const qual = String(formData.get("qual") ?? "");
  const valor = String(formData.get("chave") ?? "").trim();

  if (qual !== "anthropic" && qual !== "openai") return { error: "Chave inválida." };

  // Campo vazio = remover a chave e voltar a usar o crédito da plataforma.
  if (!valor) {
    const admin = createAdminClient();
    await admin
      .from("organizacoes")
      .update(
        qual === "anthropic"
          ? { anthropic_key_cifrada: null, anthropic_key_final: null }
          : { openai_key_cifrada: null, openai_key_final: null },
      )
      .eq("id", org.id);
    revalidatePath("/app/creditos");
    return { ok: "Chave removida. Você voltou a usar os créditos da plataforma." };
  }

  if (qual === "anthropic") {
    if (!valor.startsWith("sk-ant-")) {
      return { error: "A chave da Anthropic começa com sk-ant-. Confira o que você colou." };
    }
    const teste = await testarAnthropic(valor);
    if (!teste.ok) return { error: teste.motivo };
  } else if (!valor.startsWith("sk-")) {
    return { error: "A chave da OpenAI começa com sk-. Confira o que você colou." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("organizacoes")
    .update(
      qual === "anthropic"
        ? { anthropic_key_cifrada: cifrar(valor), anthropic_key_final: final4(valor) }
        : { openai_key_cifrada: cifrar(valor), openai_key_final: final4(valor) },
    )
    .eq("id", org.id);
  if (error) return { error: error.message };

  revalidatePath("/app/creditos");
  return {
    ok:
      qual === "anthropic"
        ? "Chave salva e testada. A partir de agora a IA usa a sua conta e não desconta créditos."
        : "Chave da OpenAI salva. As imagens passam a sair na sua conta.",
  };
}

// Chamada mínima só para saber se a chave funciona (custa frações de centavo).
async function testarAnthropic(key: string): Promise<{ ok: true } | { ok: false; motivo: string }> {
  try {
    const client = new Anthropic({ apiKey: key });
    await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4,
      messages: [{ role: "user", content: "oi" }],
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/401|authentication|invalid.*api.*key/i.test(msg)) {
      return { ok: false, motivo: "A Anthropic recusou essa chave. Gere uma nova em console.anthropic.com." };
    }
    if (/credit|billing|quota/i.test(msg)) {
      return {
        ok: false,
        motivo: "A chave é válida, mas a conta da Anthropic está sem crédito. Adicione saldo lá e tente de novo.",
      };
    }
    return { ok: false, motivo: `Não consegui testar a chave: ${msg.slice(0, 160)}` };
  }
}

/* ------------------------------- extrato ---------------------------------- */

export type Lancamento = {
  id: string;
  valor: number;
  tipo: string;
  descricao: string;
  modelo: string | null;
  saldo_depois: number;
  created_at: string;
};

export async function getExtrato(orgId: string): Promise<Lancamento[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("creditos_lancamentos")
    .select("id, valor, tipo, descricao, modelo, saldo_depois, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data as Lancamento[] | null) ?? [];
}
