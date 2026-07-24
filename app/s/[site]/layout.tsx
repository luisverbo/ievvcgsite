import { notFound } from "next/navigation";
import { buildThemeCss, googleFontsHref } from "@/lib/theme";
import { getSitePorSlug } from "@/lib/painel/site-publico";
import Analytics from "@/components/site/Analytics";
import FacebookPixel from "@/components/site/FacebookPixel";
import RevealSite from "@/components/site/RevealSite";
import WhatsappFloat from "@/components/blocks/WhatsappFloat";
import "@/components/blocks/blocks.css";

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ site: string }>;
}) {
  const { site: slug } = await params;
  const site = await getSitePorSlug(slug);
  if (!site) notFound();

  const themeCss = buildThemeCss(site.tema ?? {});
  const fontsHref = googleFontsHref(site.tema ?? {});

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
      {site.facebook_pixel_id && <FacebookPixel pixelId={site.facebook_pixel_id} />}
      <div className="pp-site">
        <RevealSite />
        {children}
      </div>
      <WhatsappFloat numero={site.whatsapp_numero} />
    </>
  );
}
