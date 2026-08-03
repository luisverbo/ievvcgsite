import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicKey } from "@/lib/ia/anthropic";
import { ehAdmin } from "../../actions";
import Construtor from "./Construtor";
import type { MensagemRow, SiteIA, VersaoRow } from "../actions";

export default async function ConstrutorPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await ehAdmin())) notFound();
  const { id } = await params;
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

  const chave = await getAnthropicKey();

  return (
    <Construtor
      site={site}
      mensagensIniciais={(msgs as MensagemRow[] | null) ?? []}
      versoesIniciais={(versoes as VersaoRow[] | null) ?? []}
      temChave={Boolean(chave)}
    />
  );
}
