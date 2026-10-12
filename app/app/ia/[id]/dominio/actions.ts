"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMinhaOrg } from "@/lib/painel/queries";
import { podeUsar } from "@/lib/painel/permissoes";
import { ehAdmin } from "@/lib/painel/admin";
import {
  vercelConfigurada,
  registrarDominio,
  removerDominio,
  conferirDns,
} from "@/lib/dominios/vercel";
import {
  cotaDeHospedagem,
  chaveDeCobranca,
  contratarSiteExtra,
  devolverExtrasNaoUsados,
  precoExtraEmReais,
} from "@/lib/dominios/cota";

export type DominioState =
  | {
      ok?: string;
      error?: string;
      /** Passou da cota: a tela pede o "de acordo" antes de cobrar. */
      precisaExtra?: boolean;
    }
  | undefined;

const INVALIDO =
  "Endereço inválido. Digite só o domínio, como clinicasorriso.com.br";

type Normalizado = { ok: true; dominio: string } | { ok: false; motivo: string };

/*
 * "clinicasorriso.com.br", "https://www.clinicasorriso.com.br/" e
 * "CLINICASORRISO.COM.BR " são a mesma intenção. Normalizamos aqui, uma vez,
 * em vez de pedir para o cliente digitar "do jeito certo".
 *
 * Subdomínio do NOSSO domínio raiz é caso à parte. Antes era recusado sempre,
 * e foi assim que o dono levou um "endereço inválido" ao tentar conectar
 * plugue.luismarketing.com.br — o domínio dele. A trava existe por um motivo
 * real (ninguém pode sequestrar o painel ou a landing), mas quem controla o
 * DNS do nosso domínio é só o dono, então para ele o atalho é legítimo: a
 * recusa fica nos hosts reservados, e o resto é liberado só para o dono.
 */
function normalizar(bruto: string, dono: boolean): Normalizado {
  let d = bruto.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "").split(":")[0];
  if (!/^[a-z0-9][a-z0-9.-]{2,251}[a-z0-9]$/.test(d)) return { ok: false, motivo: INVALIDO };
  if (!d.includes(".") || d.includes("..")) return { ok: false, motivo: INVALIDO };
  if (d.endsWith(".vercel.app")) return { ok: false, motivo: INVALIDO };

  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.toLowerCase().trim();
  const prospector = (process.env.NEXT_PUBLIC_HOST_PROSPECTOR ?? "")
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .split(":")[0];

  // Hosts que o sistema usa para si. Estes não liberam nem para o dono:
  // conectar um deles tiraria do ar o painel, a landing ou o Prospector.
  const reservados = new Set(
    [root, root && `www.${root}`, root && `app.${root}`, prospector, prospector && `www.${prospector}`]
      .filter(Boolean) as string[],
  );
  if (reservados.has(d)) {
    return { ok: false, motivo: "Este endereço é usado pelo próprio sistema e não pode ser conectado." };
  }
  if (root && d.endsWith(`.${root}`) && !dono) {
    return {
      ok: false,
      motivo: `Endereços terminados em .${root} são do sistema. Use um domínio seu — ou um subdomínio dele, como site.seudominio.com.br.`,
    };
  }
  return { ok: true, dominio: d };
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

  const dono = await ehAdmin();
  const normalizado = normalizar(String(formData.get("dominio") ?? ""), dono);
  if (!normalizado.ok) return { error: normalizado.motivo };
  const dominio = normalizado.dominio;

  /*
   * Subdomínio do nosso raiz também é endereço de site de blocos
   * ({slug}.nossodominio). Conectar um que já pertence a um site publicado
   * tiraria aquele site do ar — e o dono do site não teria como adivinhar
   * o motivo. O slug existente ganha; o domínio é recusado aqui, antes de
   * virar registro.
   */
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.toLowerCase().trim();
  if (root && dominio.endsWith(`.${root}`)) {
    const slug = dominio.slice(0, -(root.length + 1));
    const { data: ocupado } = await createAdminClient()
      .from("sites")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (ocupado) {
      return { error: `Já existe um site publicado em ${dominio}. Escolha outro nome.` };
    }
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

  /*
   * Cota de sites hospedados.
   *
   * Só consome cota um site NOVO. Conectar o "www." de um domínio que já está
   * aqui é completar o mesmo site, e não pode gerar cobrança — é justamente o
   * passo que a gente pede para ele dar.
   */
  const { data: jaTem } = await admin.from("dominios").select("dominio").eq("org_id", org.id);
  const chaves = new Set(
    ((jaTem as { dominio: string }[] | null) ?? []).map((d) => chaveDeCobranca(d.dominio)),
  );
  const siteNovo = !chaves.has(chaveDeCobranca(dominio));
  let cobrouExtra = false;

  if (siteNovo && !dono) {
    const cota = await cotaDeHospedagem(org.id);
    if (cota.livre <= 0) {
      // Primeiro clique só informa o preço. Cobrar sem um "sim" explícito é
      // como se perde a confiança de quem paga.
      if (String(formData.get("extra") ?? "") !== "1") {
        return {
          precisaExtra: true,
          error: `Você já usa ${cota.usados} de ${cota.limite} sites hospedados do seu plano. Este seria um site extra: R$ ${precoExtraEmReais()} por mês, cobrado na sua assinatura (proporcional aos dias que faltam neste mês).`,
        };
      }
      const extra = await contratarSiteExtra(org.id);
      if (!extra.ok) return { error: extra.motivo };
      cobrouExtra = true;
    }
  }

  /*
   * Daqui para baixo, qualquer falha precisa desfazer a cobrança.
   *
   * Ele autorizou pagar por um site que, no fim, não subiu. Cobrar assim mesmo
   * é o erro que ele descobre na fatura — e aí não é mais um problema técnico,
   * é um problema de confiança.
   */
  const desfazer = async () => {
    if (cobrouExtra) await devolverExtrasNaoUsados(org.id);
  };

  const r = await registrarDominio(dominio);
  if (!r.ok) {
    await desfazer();
    return { error: r.motivo };
  }

  // UNIQUE no banco decide o empate: se outro cliente registrou o mesmo
  // domínio entre a checagem e o insert, este insert falha — e é o certo.
  const { error } = await admin.from("dominios").insert({
    org_id: org.id,
    site_ia_id: siteIaId,
    dominio,
  });
  if (error) {
    await removerDominio(dominio);
    await desfazer();
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

  // Tirou um site do ar, para de pagar por ele. Roda depois do delete porque a
  // conta é feita em cima do que sobrou.
  await devolverExtrasNaoUsados(org.id);

  revalidatePath(`/app/ia/${siteIaId}/dominio`);
}
