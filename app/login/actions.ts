"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; aviso?: string } | undefined;

/*
 * Para onde mandar depois de entrar/cadastrar.
 *
 * Só caminhos internos, e só os dois destinos que fazem sentido: o painel e
 * o atalho de assinatura da landing. A checagem existe para o campo `de`,
 * que vem do formulário, não virar redirecionamento para fora do site.
 */
function destinoSeguro(bruto: FormDataEntryValue | null, padrao: string): string {
  const de = typeof bruto === "string" ? bruto : "";
  return de.startsWith("/app") || de.startsWith("/assinar") ? de : padrao;
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Preencha email e senha." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email ou senha inválidos." };

  redirect(destinoSeguro(formData.get("de"), "/app"));
}

export async function cadastrar(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email) return { error: "Informe um email válido." };
  if (password.length < 6) return { error: "A senha precisa de pelo menos 6 caracteres." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  // Se a confirmação de email estiver ligada no Supabase, não há sessão ainda.
  if (!data.session) {
    return { aviso: "Conta criada! Confira seu email para confirmar o cadastro." };
  }

  /*
   * Quem veio pelo preço da landing carrega `de=/assinar/<plano>`. O
   * onboarding recebe esse destino e devolve o cliente ao pagamento assim
   * que a organização existir — a intenção de comprar não pode se perder no
   * caminho entre criar a conta e ter onde cobrar.
   */
  const de = destinoSeguro(formData.get("de"), "");

  // Degrau do funil: a conta existe. O plano do destino diz de qual landing.
  const { registrarFunil, landingDoPlano } = await import("@/lib/vendas-funil");
  await registrarFunil(landingDoPlano(de.split("/assinar/")[1]), "Criou conta", "/cadastro");

  redirect(de ? `/app/onboarding?de=${encodeURIComponent(de)}` : "/app/onboarding");
}
