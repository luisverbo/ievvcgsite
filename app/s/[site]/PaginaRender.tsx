import { notFound } from "next/navigation";
import BlockRenderer from "@/components/blocks/BlockRenderer";
import { getSitePorSlug, getPaginaComBlocos } from "@/lib/painel/site-publico";
import { buildThemeCss, googleFontsHref, mesclarTema, temPersonalizacao } from "@/lib/theme";

// Render compartilhado entre a home ('') e as demais páginas ([slug]).
export default async function PaginaRender({
  siteSlug,
  paginaSlug,
}: {
  siteSlug: string;
  paginaSlug: string;
}) {
  const site = await getSitePorSlug(siteSlug);
  if (!site) notFound();

  const dados = await getPaginaComBlocos(site.id, paginaSlug);
  if (!dados) notFound();

  const { pagina, blocos } = dados;

  if (blocos.length === 0) {
    return (
      <div className="pp-empty">
        <div>
          <h1 style={{ fontSize: 28 }}>{site.nome}</h1>
          <p style={{ marginTop: 12 }}>
            Esta página ainda não tem conteúdo. Adicione blocos no editor.
          </p>
        </div>
      </div>
    );
  }

  // Tema próprio da página (opcional): vem depois do tema do site no DOM,
  // então sobrescreve as variáveis herdadas.
  const temaPagina = temPersonalizacao(pagina.tema) ? mesclarTema(site.tema, pagina.tema) : null;
  const cssPagina = temaPagina ? buildThemeCss(temaPagina) : null;
  const fontesPagina = temaPagina ? googleFontsHref(temaPagina) : null;

  return (
    <>
      {fontesPagina && <link rel="stylesheet" href={fontesPagina} />}
      {cssPagina && <style dangerouslySetInnerHTML={{ __html: cssPagina }} />}
      <BlockRenderer
        blocos={blocos}
        ctx={{
          siteNome: site.nome,
          logoUrl: site.logo_url,
          siteId: site.id,
          orgId: site.org_id,
          paginaId: pagina.id,
        }}
      />
    </>
  );
}

export async function tituloDaPagina(siteSlug: string, paginaSlug: string) {
  const site = await getSitePorSlug(siteSlug);
  if (!site) return "Página não encontrada";
  const dados = await getPaginaComBlocos(site.id, paginaSlug);
  return dados?.pagina.titulo ? `${dados.pagina.titulo} · ${site.nome}` : site.nome;
}
