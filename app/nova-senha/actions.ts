"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type NovaSenhaState = { error?: string } | undefined;

/*
 * Grava a senha nova de quem chegou pelo link do e-mail.
 *
 * Aqui NÃO se pede a senha atual — o sentido da tela é justamente atender
 * quem não sabe qual é. Quem autoriza a troca é a sessão criada pelo link,
 * que só existe para quem abriu o e-mail da própria conta.
 *
 * Oito caracteres, o mesmo mínimo da troca dentro do painel: duas regras
 * diferentes para a mesma senha confundem sem proteger ninguém.
 */
export async function definirSenha(
  _prev: NovaSenhaState,
  formData: FormData,
): Promise<NovaSenhaState> {
  const nova = String(formData.get("senha_nova") ?? "");
  const repetida = String(formData.get("senha_repetida") ?? "");

  if (nova.length < 8) return { error: "A senha precisa de pelo menos 8 caracteres." };
  if (nova !== repetida) return { error: "As duas senhas não são iguais." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "O link expirou antes de você salvar. Peça um novo em “Esqueci minha senha”." };
  }

  const { error } = await supabase.auth.updateUser({ password: nova });
  if (error) return { error: error.message };

  // Já está logado — mandar para o login depois de trocar seria pedir a senha
  // nova a alguém que acabou de digitá-la duas vezes.
  redirect("/app");
}
