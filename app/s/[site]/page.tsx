import PaginaRender, { tituloDaPagina } from "./PaginaRender";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  return { title: await tituloDaPagina(site, "") };
}

export default async function SiteHome({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  return <PaginaRender siteSlug={site} paginaSlug="" />;
}
