import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { podeUsar } from "@/lib/painel/permissoes";
import { statusDaConta } from "@/lib/creditos/conta";
import Construtor from "./Construtor";
import type { MensagemRow, SiteIA, VersaoRow } from "../actions";
import type { EmpresaVinculada } from "./Construtor";

// A geração de imagem (server action chamada a partir desta rota) pode levar
// mais de um minuto por foto.
export const maxDuration = 300;

export default async function ConstrutorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  // ?pedido=... chega da prospecção, com o briefing da empresa já montado.
  searchParams: Promise<{ pedido?: string }>;
}) {
  if (!(await podeUsar("construtor"))) notFound();
  const { id } = await params;
  const { pedido } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data: siteRow } = await supabase.from("sites_ia").select("*").eq("id", id).maybeSingle();
  if (!siteRow) notFound();
  const site = siteRow as SiteIA;

  const [{ data: msgs }, { data: versoes }] = await Promise.all([
    supabase
      .from("sites_ia_mensagens")
      .select("id, papel, conteudo, anexos, created_at")
      .eq("site_ia_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("sites_ia_versoes")
      .select("id, resumo, created_at")
      .eq("site_ia_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  // Empresa que originou este site (quando veio da prospecção): sem isto a
  // página vira órfã e você perde o contato de quem ia comprar.
  let empresa: EmpresaVinculada = null;
  if (site.prospecto_id) {
    const { data: p } = await supabase
      .from("prospeccao")
      .select("id, nome, telefone, endereco, instagram, pontuacao, nicho_busca, local_busca")
      .eq("id", site.prospecto_id)
      .maybeSingle();
    empresa = (p as EmpresaVinculada) ?? null;
  }

  const conta = await statusDaConta(site.org_id);

  // Endereço público completo, para o link ser copiável e clicável.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const protocolo = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const urlPublica = host ? `${protocolo}://${host}/ia/${site.slug}` : `/ia/${site.slug}`;

  return (
    <Construtor
      site={site}
      mensagensIniciais={(msgs as MensagemRow[] | null) ?? []}
      versoesIniciais={(versoes as VersaoRow[] | null) ?? []}
      contaPronta={conta.pronta}
      avisoConta={conta.aviso}
      urlPublica={urlPublica}
      pedidoInicial={pedido?.slice(0, 4000) ?? ""}
      empresa={empresa}
    />
  );
}
