import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildThemeCss, googleFontsHref } from "@/lib/theme";
import Analytics from "@/components/site/Analytics";
import type { Site } from "@/lib/types";

export const revalidate = 60;

async function getSitePorSlug(slug: string): Promise<Site | null> {
  const supabase = await createClient();
  // RLS decide o acesso: visitante só enxerga site publicado; membro da org
  // enxerga o próprio site mesmo em rascunho (pré-visualização natural).
  const { data } = await supabase.from("sites").select("*").eq("slug", slug).maybeSingle();
  return (data as Site | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }) {
  const { site: slug } = await params;
  const site = await getSitePorSlug(slug);
  return { title: site?.nome ?? "Página não encontrada" };
}

export default async function SitePublico({ params }: { params: Promise<{ site: string }> }) {
  const { site: slug } = await params;
  const site = await getSitePorSlug(slug);
  if (!site) notFound();

  const themeCss = buildThemeCss(site.tema ?? {});
  const fontsHref = googleFontsHref(site.tema ?? {});

  // Fase 0: placeholder tematizado. Na Fase 1 este render vira o motor de
  // blocos (paginas + blocos por jsonb).
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
      {site.publicado && <Analytics orgId={site.org_id} siteId={site.id} />}
      <div
        className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
        style={{ background: "var(--color-night)", color: "var(--color-cream)" }}
      >
        <span
          className="rounded-full border px-4 py-1.5 text-xs font-semibold"
          style={{ borderColor: "var(--color-gold)", color: "var(--color-gold)" }}
        >
          {site.publicado ? "no ar" : "rascunho — só você vê"}
        </span>
        <h1
          className="mt-6 max-w-2xl text-5xl font-extrabold leading-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {site.nome}
        </h1>
        <p className="mt-4 max-w-md" style={{ color: "var(--color-cream-dim)" }}>
          Este site está sendo construído no PáginaPro. Em breve, uma página incrível aqui.
        </p>
        <div
          className="mt-8 h-1.5 w-40 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, var(--color-coral), var(--color-gold), var(--color-green))",
          }}
        />
      </div>
    </>
  );
}
