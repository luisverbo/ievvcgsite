import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import BlockRenderer from "@/components/blocks/BlockRenderer";
import { getSitePorSlug, getPaginaComBlocos } from "@/lib/painel/site-publico";
import { buildThemeCss, googleFontsHref, mesclarTema, temPersonalizacao } from "@/lib/theme";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Este host é um domínio PRÓPRIO cadastrado, e não um slug?
 *
 * O caso que isto conserta: o dono do sistema aponta um subdomínio do próprio
 * domínio dele (plugue.luismarketing.com.br) para uma página. O proxy vê que
 * o host termina no domínio raiz do produto e reescreve para /s/plugue,
 * procurando um site com slug "plugue" — que não existe. A página do cliente
 * nunca era alcançada, e ele via 404 sem entender por quê.
 *
 * O proxy não pode resolver isso sozinho: ele roda em TODO request e não
 * consulta banco. Aqui dá: só perguntamos quando o slug já falhou, que é o
 * caminho raro.
 */
async function ehDominioProprio(): Promise<boolean> {
  try {
    const host = (await headers()).get("host")?.toLowerCase().split(":")[0] ?? "";
    if (!host) return false;
    const { data } = await createAdminClient()
      .from("dominios")
      .select("site_ia_id")
      .eq("dominio", host)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

// Render compartilhado entre a home ('') e as demais páginas ([slug]).
export default async function PaginaRender({
  siteSlug,
  paginaSlug,
}: {
  siteSlug: string;
  paginaSlug: string;
}) {
  const site = await getSitePorSlug(siteSlug);
  if (!site) {
    // Slug não existe, mas o host é um domínio próprio: a página é a de lá.
    const host = (await headers()).get("host")?.toLowerCase().split(":")[0] ?? "";
    if (await ehDominioProprio()) redirect(`/dominio/${host}`);
    notFound();
  }

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
