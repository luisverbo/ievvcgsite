import { redirect } from "next/navigation";
import { getMinhaOrg, getSites } from "@/lib/painel/queries";
import { TEMPLATES, CATEGORIAS_TEMPLATE } from "@/lib/templates/catalog";
import TemplateCard from "./TemplateCard";

export default async function TemplatesPage() {
  const org = await getMinhaOrg();
  if (!org) redirect("/app/onboarding");

  const sites = await getSites(org.id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold">Templates</h1>
        <p className="mt-1 text-sm text-paper-dim">
          Escolha um template pronto para montar sua página em minutos.
        </p>
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
                <TemplateCard key={template.id} template={template} sites={sites} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
