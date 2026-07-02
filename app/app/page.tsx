import Link from "next/link";
import { redirect } from "next/navigation";
import { getMinhaOrg, getSites } from "@/lib/painel/queries";
import { cardClass } from "@/components/painel/ui";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN;

export default async function PainelHome() {
  const org = await getMinhaOrg();
  if (!org) redirect("/app/onboarding");

  const sites = await getSites(org.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">{org.nome}</h1>
          <p className="mt-1 text-sm text-paper-dim">
            Plano {org.plano === "pro" ? "Pro" : "Grátis"} · {sites.length}{" "}
            {sites.length === 1 ? "site" : "sites"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {sites.map((site) => (
          <Link key={site.id} href={`/app/sites/${site.id}`} className={`${cardClass} hover:border-brand-2`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{site.nome}</h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  site.publicado ? "bg-ok/15 text-ok" : "bg-white/10 text-paper-dim"
                }`}
              >
                {site.publicado ? "No ar" : "Rascunho"}
              </span>
            </div>
            <p className="mt-1 text-sm text-paper-dim">
              {site.slug}
              {ROOT ? `.${ROOT}` : ""}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
