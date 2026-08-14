"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMinhaOrg } from "@/lib/painel/queries";
import { podeUsar } from "@/lib/painel/permissoes";
import {
  vercelConfigurada,
  registrarDominio,
  removerDominio,
  conferirDns,
} from "@/lib/dominios/vercel";

export type DominioState = { ok?: string; error?: string } | undefined;

/*
 * "clinicasorriso.com.br", "https://www.clinicasorriso.com.br/" e
 * "CLINICASORRISO.COM.BR " são a mesma intenção. Normalizamos aqui, uma vez,
 * em vez de pedir para o cliente digitar "do jeito certo".
 */
function normalizar(bruto: string): string | null {
  let d = bruto.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "").split(":")[0];
  if (!/^[a-z0-9][a-z0-9.-]{2,251}[a-z0-9]$/.test(d)) return null;
  if (!d.includes(".") || d.includes("..")) return null;
  // Domínio nosso não pode: criaria um vínculo que sequestra o próprio painel.
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.toLowerCase();
  if (d.endsWith(".vercel.app")) return null;
  if (root && (d === root || d.endsWith(`.${root}`))) return null;
  return d;
}

export async function adicionarDominio(
  siteIaId: string,
  _prev: DominioState,
  formData: FormData,
): Promise<DominioState> {
  if (!(await podeUsar("hospedagem"))) {
    return { error: "O domínio próprio faz parte dos planos Pro e Agência." };
  }
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };
  if (!vercelConfigurada()) {
    return { error: "A hospedagem ainda não está configurada. Fale com o suporte." };
  }

  const dominio = normalizar(String(formData.get("dominio") ?? ""));
  if (!dominio) {
    return { error: "Endereço inválido. Digite só o domínio, como clinicasorriso.com.br" };
  }

  // A página precisa ser desta organização — o supabase com RLS garante.
  const supabase = await createClient();
  const { data: siteRow } = await supabase
    .from("sites_ia")
    .select("id, publicado")
    .eq("id", siteIaId)
    .maybeSingle();
  const site = siteRow as { id: string; publicado: boolean } | null;
  if (!site) return { error: "Página não encontrada." };
  if (!site.publicado) {
    return { error: "Publique a página primeiro — um domínio apontando para página despublicada mostraria erro." };
  }

  const admin = createAdminClient();
  const { count } = await admin
    .from("dominios")
    .select("id", { count: "exact", head: true })
    .eq("org_id", org.id);
  if ((count ?? 0) >= 20) {
    return { error: "Você chegou a 20 domínios. Fale com o suporte para aumentar." };
  }

  const r = await registrarDominio(dominio);
  if (!r.ok) return { error: r.motivo };

  // UNIQUE no banco decide o empate: se outro cliente registrou o mesmo
  // domínio entre a checagem e o insert, este insert falha — e é o certo.
  const { error } = await admin.from("dominios").insert({
    org_id: org.id,
    site_ia_id: siteIaId,
    dominio,
  });
  if (error) {
    if (error.code === "23505") {
      return { error: "Este domínio já está cadastrado no sistema." };
    }
    return { error: error.message };
  }

  revalidatePath(`/app/ia/${siteIaId}/dominio`);
  return { ok: "Domínio registrado! Agora configure o DNS conforme as instruções abaixo." };
}

export async function verificarDominio(siteIaId: string, dominioId: string) {
  if (!(await podeUsar("hospedagem"))) return;
  const org = await getMinhaOrg();
  if (!org) return;

  const admin = createAdminClient();
  const { data } = await admin
    .from("dominios")
    .select("id, dominio")
    .eq("id", dominioId)
    .eq("org_id", org.id)
    .maybeSingle();
  const linha = data as { id: string; dominio: string } | null;
  if (!linha) return;

  const estado = await conferirDns(linha.dominio);
  await admin
    .from("dominios")
    .update(
      estado.pronto
        ? { status: "ativo", detalhe: null, verificado_em: new Date().toISOString() }
        : { status: "aguardando_dns", detalhe: estado.motivo },
    )
    .eq("id", linha.id);

  revalidatePath(`/app/ia/${siteIaId}/dominio`);
}

export async function apagarDominio(siteIaId: string, dominioId: string) {
  if (!(await podeUsar("hospedagem"))) return;
  const org = await getMinhaOrg();
  if (!org) return;

  const admin = createAdminClient();
  const { data } = await admin
    .from("dominios")
    .select("id, dominio")
    .eq("id", dominioId)
    .eq("org_id", org.id)
    .maybeSingle();
  const linha = data as { id: string; dominio: string } | null;
  if (!linha) return;

  // Primeiro a Vercel, depois o banco. A ordem importa: apagado do banco e
  // vivo na Vercel, o domínio responderia 404 para sempre sem dono aparente.
  await removerDominio(linha.dominio);
  await admin.from("dominios").delete().eq("id", linha.id);

  revalidatePath(`/app/ia/${siteIaId}/dominio`);
}
