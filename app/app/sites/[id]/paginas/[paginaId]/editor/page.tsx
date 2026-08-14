import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ehAdmin } from "@/lib/painel/admin";
import { getSite } from "@/lib/painel/queries";
import Editor from "./Editor";
import type { Bloco, Pagina } from "@/lib/types";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN;

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string; paginaId: string }>;
}) {
  // Editor por blocos: ferramenta interna, o cliente usa o construtor de IA.
  if (!(await ehAdmin())) notFound();
  const { id, paginaId } = await params;
  const site = await getSite(id);
  if (!site) notFound();

  const supabase = await createClient();
  const { data: paginaRow } = await supabase
    .from("paginas")
    .select("*")
    .eq("id", paginaId)
    .eq("site_id", site.id)
    .maybeSingle();
  if (!paginaRow) notFound();
  const pagina = paginaRow as Pagina;

  const { data: blocosRows } = await supabase
    .from("blocos")
    .select("id, tipo, config, oculto")
    .eq("pagina_id", paginaId)
    .order("ordem", { ascending: true });

  const blocos = ((blocosRows as Bloco[] | null) ?? []).map((b) => ({
    id: b.id,
    tipo: b.tipo,
    config: b.config,
    oculto: b.oculto,
  }));

  // Prévia dentro do painel usa sempre o caminho /s (não depende do domínio).
  const urlPublicaPreview = `/s/${site.slug}${pagina.slug ? `/${pagina.slug}` : ""}`;
  // Botão "Ver site ↗" usa o subdomínio real quando há domínio configurado.
  const urlVer = ROOT
    ? `https://${site.slug}.${ROOT}${pagina.slug ? `/${pagina.slug}` : ""}`
    : urlPublicaPreview;

  return (
    <Editor
      siteAdminId={site.id}
      siteNome={site.nome}
      siteSlug={site.slug}
      orgId={site.org_id}
      paginaId={pagina.id}
      paginaSlug={pagina.slug}
      paginaTitulo={pagina.titulo}
      siteId={site.id}
      publicado={pagina.publicado}
      urlPublica={urlPublicaPreview}
      urlVer={urlVer}
      blocosIniciais={blocos}
      temaSite={site.tema ?? {}}
      temaPagina={pagina.tema ?? null}
    />
  );
}
