"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";

export type OnboardingState = { error?: string } | undefined;

export async function criarOrganizacao(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const nomeOrg = String(formData.get("nome_org") ?? "").trim();
  const nomeSite = String(formData.get("nome_site") ?? "").trim();
  const slugBruto = String(formData.get("slug") ?? "").trim();

  if (!nomeOrg) return { error: "Informe o nome da sua empresa ou projeto." };
  if (!nomeSite) return { error: "Informe o nome do site." };

  const slug = slugify(slugBruto || nomeSite);
  if (slug.length < 3) return { error: "O endereço precisa ter pelo menos 3 caracteres." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("criar_organizacao_com_site", {
    nome_org: nomeOrg,
    nome_site: nomeSite,
    slug_site: slug,
  });

  if (error) {
    if (error.message.includes("duplicate") || error.code === "23505") {
      return { error: "Esse endereço já está em uso. Tente outro." };
    }
    if (error.message.includes("não está disponível")) {
      return { error: "Esse endereço não está disponível. Tente outro." };
    }
    return { error: error.message };
  }

  redirect(`/app/sites/${data}`);
}
