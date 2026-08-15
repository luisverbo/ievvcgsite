"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMinhaOrg } from "@/lib/painel/queries";

/*
 * Minha conta: nome, e-mail e senha.
 *
 * Regra que vale para as três: nada muda sem a SENHA ATUAL. É o que impede
 * que um notebook esquecido aberto, ou uma sessão roubada, vire uma conta
 * perdida — o invasor trocaria e-mail e senha e o dono não entraria mais.
 * A conferência é feita com signInWithPassword, que é a única forma honesta
 * de saber se quem está ali sabe mesmo a senha.
 */

export type ContaState = { ok?: string; error?: string } | undefined;

async function usuarioAtual() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/*
 * Confere a senha atual sem derrubar a sessão de quem está logado.
 *
 * Usa um cliente ADMIN separado (não o da sessão) de propósito: um
 * signInWithPassword no cliente da sessão reescreveria os cookies no meio da
 * ação. Aqui só perguntamos "esta senha bate?" e jogamos a resposta fora.
 */
async function senhaConfere(email: string, senha: string): Promise<boolean> {
  if (!senha) return false;
  const admin = createAdminClient();
  const { error } = await admin.auth.signInWithPassword({ email, password: senha });
  return !error;
}

/* --------------------------------- nome ---------------------------------- */

export async function salvarNome(_prev: ContaState, formData: FormData): Promise<ContaState> {
  const { supabase, user } = await usuarioAtual();
  if (!user) return { error: "Sessão expirada. Entre de novo." };

  const nomePessoa = String(formData.get("nome_pessoa") ?? "").trim();
  const nomeOrg = String(formData.get("nome_org") ?? "").trim();
  if (nomeOrg.length < 2) return { error: "O nome da empresa precisa ter pelo menos 2 letras." };

  // Nome da pessoa mora no perfil do usuário; nome da empresa, na organização.
  const { error: erroPerfil } = await supabase.auth.updateUser({
    data: { nome: nomePessoa.slice(0, 80) },
  });
  if (erroPerfil) return { error: erroPerfil.message };

  const org = await getMinhaOrg();
  if (org) {
    const { error } = await supabase
      .from("organizacoes")
      .update({ nome: nomeOrg.slice(0, 120) })
      .eq("id", org.id);
    if (error) return { error: error.message };
  }

  revalidatePath("/app/conta");
  revalidatePath("/app");
  return { ok: "Dados salvos." };
}

/* --------------------------------- e-mail -------------------------------- */

export async function trocarEmail(_prev: ContaState, formData: FormData): Promise<ContaState> {
  const { supabase, user } = await usuarioAtual();
  if (!user?.email) return { error: "Sessão expirada. Entre de novo." };

  const novo = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha_atual") ?? "");

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(novo)) return { error: "E-mail inválido." };
  if (novo === user.email.toLowerCase()) return { error: "Este já é o seu e-mail." };
  if (!(await senhaConfere(user.email, senha))) {
    return { error: "Senha atual incorreta." };
  }

  /*
   * O e-mail NÃO troca agora: o Supabase manda um link de confirmação para o
   * endereço novo e só troca quando ele for aberto. É proteção contra erro de
   * digitação — trocar direto para um endereço errado tranca o dono para fora.
   */
  const { error } = await supabase.auth.updateUser({ email: novo });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      return { error: "Já existe uma conta com este e-mail." };
    }
    return { error: error.message };
  }

  revalidatePath("/app/conta");
  return {
    ok: `Enviamos um link de confirmação para ${novo}. O e-mail só muda depois que você abrir esse link — até lá, continue entrando com o atual.`,
  };
}

/* --------------------------------- senha --------------------------------- */

export async function trocarSenha(_prev: ContaState, formData: FormData): Promise<ContaState> {
  const { supabase, user } = await usuarioAtual();
  if (!user?.email) return { error: "Sessão expirada. Entre de novo." };

  const atual = String(formData.get("senha_atual") ?? "");
  const nova = String(formData.get("senha_nova") ?? "");
  const repetida = String(formData.get("senha_repetida") ?? "");

  if (nova.length < 8) return { error: "A senha nova precisa de pelo menos 8 caracteres." };
  if (nova !== repetida) return { error: "As duas senhas novas não são iguais." };
  if (nova === atual) return { error: "A senha nova é igual à atual." };
  if (!(await senhaConfere(user.email, atual))) return { error: "Senha atual incorreta." };

  const { error } = await supabase.auth.updateUser({ password: nova });
  if (error) return { error: error.message };

  revalidatePath("/app/conta");
  return { ok: "Senha alterada. Use a nova da próxima vez que entrar." };
}
