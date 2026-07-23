import Link from "next/link";
import { notFound } from "next/navigation";
import { getPaginas, getSite } from "@/lib/painel/queries";
import SiteForm from "./SiteForm";
import NovaPaginaForm from "./NovaPaginaForm";
import ExcluirSite from "./ExcluirSite";
import { excluirPagina } from "./paginas/actions";
import { cardClass } from "@/components/painel/ui";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN;

export default async function SitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = await getSite(id);
  if (!site) notFound();

  const paginas = await getPaginas(site.id);
  const urlPublica = ROOT ? `https://${site.slug}.${ROOT}` : `/s/${site.slug}`;

  return (
    <div className="painel-wrap flex flex-col gap-6">
      <div>
        <Link href="/app" className="text-sm text-paper-dim hover:text-paper">
          ← Meus sites
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold">{site.nome}</h1>
          <a
            href={urlPublica}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-brand-2 hover:underline"
          >
            Ver site ↗
          </a>
          <Link
            href={`/app/sites/${site.id}/metricas`}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-bold text-paper transition hover:border-brand-2 hover:text-brand-2"
          >
            📊 Métricas
          </Link>
        </div>
      </div>

      <div className={cardClass}>
        <h2 className="mb-1 text-lg font-bold">Páginas</h2>
        <p className="mb-4 text-sm text-paper-dim">
          Clique em “Editar” para montar a página com blocos.
        </p>
        <div className="mb-4 flex flex-col divide-y divide-white/10">
          {paginas.map((pagina) => (
            <div key={pagina.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">
                  {pagina.titulo}
                  {pagina.slug === "" && <span className="ml-2 text-xs text-paper-dim">(inicial)</span>}
                </div>
                <div className="truncate text-xs text-paper-dim">/{pagina.slug || ""}</div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    pagina.publicado ? "bg-ok/15 text-ok" : "bg-white/10 text-paper-dim"
                  }`}
                >
                  {pagina.publicado ? "Publicada" : "Rascunho"}
                </span>
                <Link
                  href={`/app/sites/${site.id}/metricas?pg=${encodeURIComponent(`/s/${site.slug}${pagina.slug ? `/${pagina.slug}` : ""}`)}`}
                  title="Métricas desta página"
                  className="text-sm text-paper-dim transition hover:text-paper"
                >
                  📊
                </Link>
                <Link
                  href={`/app/sites/${site.id}/paginas/${pagina.id}/editor`}
                  className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-2"
                >
                  Editar
                </Link>
                {pagina.slug !== "" && (
                  <form action={excluirPagina.bind(null, pagina.id, site.id)}>
                    <button className="text-sm text-danger hover:underline" type="submit">
                      Excluir
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col flex-wrap gap-2 sm:flex-row">
          <NovaPaginaForm siteId={site.id} />
          <Link
            href={`/app/templates?site=${site.id}`}
            className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-brand-2/50 py-2.5 text-sm font-semibold text-brand-2 transition hover:border-brand-2 hover:bg-brand/5"
          >
            ✨ Página com template
          </Link>
        </div>
      </div>

      <div className={cardClass}>
        <h2 className="mb-4 text-lg font-bold">Configurações</h2>
        <SiteForm site={site} />
      </div>

      <div className="rounded-xl border border-danger/25 bg-danger/5 p-5">
        <h2 className="mb-1 text-lg font-bold text-danger">Zona de perigo</h2>
        <p className="mb-4 text-sm text-paper-dim">
          Excluir o site remove todas as páginas, blocos e leads. Não dá para desfazer.
        </p>
        <ExcluirSite siteId={site.id} siteNome={site.nome} />
      </div>
    </div>
  );
}
