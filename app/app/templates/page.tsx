import { redirect } from "next/navigation";
import { getMinhaOrg, getSites } from "@/lib/painel/queries";
import { TEMPLATES, CATEGORIAS_TEMPLATE } from "@/lib/templates/catalog";
import TemplateCard from "./TemplateCard";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const org = await getMinhaOrg();
  if (!org) redirect("/app/onboarding");

  const sites = await getSites(org.id);
  const { site: sitePreSelecionado } = await searchParams;

  return (
    <div className="painel-wrap flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold">Templates</h1>
        <p className="mt-1 text-sm text-paper-dim">
          Páginas completas, pensadas para converter. Escolha, troque os textos e publique.
        </p>
        {sites.length === 0 && (
          <p className="mt-3 rounded-lg border border-brand-2/30 bg-brand/10 px-4 py-2.5 text-sm text-paper">
            Você ainda não tem sites. Escolha um template abaixo — ele cria seu primeiro site já pronto. ✨
          </p>
        )}
      </div>

      {CATEGORIAS_TEMPLATE.map((cat) => {
        const daCat = TEMPLATES.filter((t) => t.categoria === cat);
        return (
          <div key={cat}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-paper-dim">
              {cat}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {daCat.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  sites={sites}
                  sitePreSelecionado={sitePreSelecionado}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
