import PaginaRender, { tituloDaPagina } from "../PaginaRender";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string; slug: string }>;
}) {
  const { site, slug } = await params;
  return { title: await tituloDaPagina(site, slug) };
}

export default async function SitePagina({
  params,
}: {
  params: Promise<{ site: string; slug: string }>;
}) {
  const { site, slug } = await params;
  return <PaginaRender siteSlug={site} paginaSlug={slug} />;
}
