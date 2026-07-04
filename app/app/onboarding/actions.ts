"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";
import { semearBlocos } from "@/lib/painel/seed";
import { semearBlocosComConfig } from "@/lib/painel/seed";
import { HOME_INICIAL } from "@/lib/blocks/registry";
import { TEMPLATES } from "@/lib/templates/catalog";

export type OnboardingState = { error?: string } | undefined;

export async function criarOrganizacao(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const nomeOrg = String(formData.get("nome_org") ?? "").trim();
  const nomeSite = String(formData.get("nome_site") ?? "").trim();
  const slugBruto = String(formData.get("slug") ?? "").trim();
  const nicho = String(formData.get("nicho") ?? "").trim();

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

  const siteId = data as string;
  const { data: home } = await supabase
    .from("paginas")
    .select("id, org_id")
    .eq("site_id", siteId)
    .eq("slug", "")
    .maybeSingle();

  if (home) {
    const h = home as { id: string; org_id: string };
    // Se o usuário escolheu um nicho, usa os blocos do template correspondente.
    const template = nicho ? TEMPLATES.find((t) => t.nicho === nicho) : undefined;
    if (template) {
      await semearBlocosComConfig(h.id, h.org_id, template.blocos);
      // O template carrega uma identidade visual própria (cores + fontes).
      if (template.tema) {
        await supabase.from("sites").update({ tema: template.tema }).eq("id", siteId);
      }
    } else {
      await semearBlocos(h.id, h.org_id, HOME_INICIAL);
    }
  }

  redirect(`/app/sites/${siteId}`);
}
