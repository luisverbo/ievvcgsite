import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg, getSites } from "@/lib/painel/queries";
import NovoSite from "./NovoSite";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN;

export default async function PainelHome() {
  const org = await getMinhaOrg();
  if (!org) redirect("/app/onboarding");

  const sites = await getSites(org.id);

  const supabase = await createClient();
  const [{ count: totalPaginas }, { count: totalLeads }] = await Promise.all([
    supabase.from("paginas").select("id", { count: "exact", head: true }).eq("org_id", org.id),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("org_id", org.id),
  ]);

  const stats = [
    { rotulo: "Sites", valor: sites.length },
    { rotulo: "Páginas", valor: totalPaginas ?? 0 },
    { rotulo: "Leads recebidos", valor: totalLeads ?? 0 },
    { rotulo: "Publicados", valor: sites.filter((s) => s.publicado).length },
  ];

  return (
    <div className="painel-wrap flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{org.nome}</h1>
          <p className="mt-1 text-sm text-paper-dim">
            Plano{" "}
            <span className="rounded-full bg-brand/20 px-2 py-0.5 text-xs font-bold text-brand-2">
              {org.plano === "pro" ? "Pro" : "Grátis"}
            </span>
          </p>
        </div>
        <NovoSite />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.rotulo} className="rounded-xl border border-white/10 bg-ink-2 p-4">
            <div className="text-2xl font-extrabold">{s.valor}</div>
            <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-paper-dim">
              {s.rotulo}
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-paper-dim">
          Meus sites
        </h2>
        {sites.length === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <NovoSite variante="vazio" />
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {sites.map((site) => (
            <Link
              key={site.id}
              href={`/app/sites/${site.id}`}
              className="group overflow-hidden rounded-xl border border-white/10 bg-ink-2 transition hover:-translate-y-0.5 hover:border-brand-2/60 hover:shadow-xl"
            >
              <div
                className="flex h-24 items-end p-4"
                style={{
                  background:
                    "linear-gradient(135deg, color-mix(in srgb, var(--color-brand) 30%, var(--color-ink-2)), var(--color-ink-2) 70%)",
                }}
              >
                <span className="font-display text-xl font-extrabold">{site.nome}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="truncate text-sm text-paper-dim">
                  {site.slug}
                  {ROOT ? `.${ROOT}` : ""}
                </span>
                <span
                  className={`ml-3 flex-none rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    site.publicado ? "bg-ok/15 text-ok" : "bg-white/10 text-paper-dim"
                  }`}
                >
                  {site.publicado ? "No ar" : "Rascunho"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
