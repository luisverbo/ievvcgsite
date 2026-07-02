import Link from "next/link";
import { notFound } from "next/navigation";
import { getPaginas, getSite } from "@/lib/painel/queries";
import SiteForm from "./SiteForm";
import { cardClass } from "@/components/painel/ui";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN;

export default async function SitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = await getSite(id);
  if (!site) notFound();

  const paginas = await getPaginas(site.id);
  const urlPublica = ROOT ? `https://${site.slug}.${ROOT}` : `/s/${site.slug}`;

  return (
    <div className="flex flex-col gap-6">
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
        </div>
      </div>

      <div className={cardClass}>
        <h2 className="mb-1 text-lg font-bold">Páginas</h2>
        <p className="mb-4 text-sm text-paper-dim">
          O editor de blocos chega na próxima fase — por enquanto a página inicial é criada
          automaticamente.
        </p>
        <div className="flex flex-col divide-y divide-white/10">
          {paginas.map((pagina) => (
            <div key={pagina.id} className="flex items-center justify-between py-3">
              <div>
                <div className="font-semibold">{pagina.titulo}</div>
                <div className="text-xs text-paper-dim">/{pagina.slug || ""}</div>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  pagina.publicado ? "bg-ok/15 text-ok" : "bg-white/10 text-paper-dim"
                }`}
              >
                {pagina.publicado ? "Publicada" : "Rascunho"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={cardClass}>
        <h2 className="mb-4 text-lg font-bold">Configurações</h2>
        <SiteForm site={site} />
      </div>
    </div>
  );
}
