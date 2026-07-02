"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; aviso?: string } | undefined;

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Preencha email e senha." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email ou senha inválidos." };

  const de = formData.get("de");
  redirect(typeof de === "string" && de.startsWith("/app") ? de : "/app");
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

  redirect("/app/onboarding");
}
