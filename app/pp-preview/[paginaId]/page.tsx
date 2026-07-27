import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildThemeCss, googleFontsHref, mesclarTema } from "@/lib/theme";
import BlocosLive from "@/components/blocks/BlocosLive";
import type { Bloco, Pagina, Site } from "@/lib/types";
import "@/components/blocks/blocks.css";

// Prévia do editor: mesma aparência da página publicada, mas sempre dinâmica
// e conectada ao editor (atualiza enquanto você digita, antes de salvar).
// Fica fora de /s para não deixar a página pública lenta. RLS garante que só
// membros da organização enxerguem.
export const dynamic = "force-dynamic";

export default async function PreviewPage({ params }: { params: Promise<{ paginaId: string }> }) {
  const { paginaId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(paginaId)) notFound();

  const supabase = await createClient();
  const { data: paginaRow } = await supabase
    .from("paginas")
    .select("*")
    .eq("id", paginaId)
    .maybeSingle();
  if (!paginaRow) notFound();
  const pagina = paginaRow as Pagina;

  const [{ data: siteRow }, { data: blocosRows }] = await Promise.all([
    supabase.from("sites").select("*").eq("id", pagina.site_id).maybeSingle(),
    supabase
      .from("blocos")
      .select("*")
      .eq("pagina_id", paginaId)
      .eq("oculto", false)
      .order("ordem", { ascending: true }),
  ]);
  if (!siteRow) notFound();
  const site = siteRow as Site;
  const blocos = (blocosRows as Bloco[] | null) ?? [];

  const temaFinal = mesclarTema(site.tema, pagina.tema);
  const themeCss = buildThemeCss(temaFinal);
  const fontsHref = googleFontsHref(temaFinal);

  return (
    <>
      {fontsHref && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="stylesheet" href={fontsHref} />
        </>
      )}
      {themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}
      <div className="pp-site">
        <BlocosLive
          blocosIniciais={blocos.map((b) => ({ id: b.id, tipo: b.tipo, config: b.config }))}
          ctx={{
            siteNome: site.nome,
            logoUrl: site.logo_url,
            siteId: site.id,
            orgId: site.org_id,
            paginaId: pagina.id,
            preview: true,
          }}
        />
      </div>
    </>
  );
}
