import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg, getSites } from "@/lib/painel/queries";
import NovoSite from "./NovoSite";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN;

// Cor de capa por site, derivada do id — cada card tem identidade própria.
const CAPAS = [
  ["#6c5ce7", "#a29bfe"],
  ["#e8843c", "#f5b76b"],
  ["#2fbf8f", "#7ee0bd"],
  ["#e15c8a", "#f59bbb"],
  ["#3f8cff", "#8ec1ff"],
  ["#c2657f", "#e8a7b8"],
];
// Fora do componente: mantém o corpo do render puro (regra do React).
function desde30Dias() {
  return new Date(Date.now() - 30 * 86_400_000).toISOString();
}

function capaDoSite(id: string) {
  let soma = 0;
  for (const ch of id) soma += ch.charCodeAt(0);
  return CAPAS[soma % CAPAS.length];
}

export default async function PainelHome() {
  const org = await getMinhaOrg();
  if (!org) redirect("/app/onboarding");

  const sites = await getSites(org.id);
  const supabase = await createClient();
  const desde = desde30Dias();

  // Um número por site: visitas, cliques e leads dos últimos 30 dias.
  const [{ count: totalPaginas }, { count: totalLeads }, { data: eventos }, { data: leads }] =
    await Promise.all([
      supabase.from("paginas").select("id", { count: "exact", head: true }).eq("org_id", org.id),
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("org_id", org.id),
      supabase
        .from("analytics_eventos")
        .select("site_id, tipo")
        .eq("org_id", org.id)
        .gte("created_at", desde)
        .limit(20000),
      supabase.from("leads").select("site_id").eq("org_id", org.id).gte("created_at", desde),
    ]);

  const porSite = new Map<string, { visitas: number; cliques: number; leads: number }>();
  const zero = () => ({ visitas: 0, cliques: 0, leads: 0 });
  for (const e of (eventos as { site_id: string; tipo: string }[] | null) ?? []) {
    const m = porSite.get(e.site_id) ?? zero();
    if (e.tipo === "pageview") m.visitas++;
    else if (e.tipo === "click") m.cliques++;
    porSite.set(e.site_id, m);
  }
  for (const l of (leads as { site_id: string | null }[] | null) ?? []) {
    if (!l.site_id) continue;
    const m = porSite.get(l.site_id) ?? zero();
    m.leads++;
    porSite.set(l.site_id, m);
  }

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
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-paper-dim">
            Meus sites
          </h2>
          <span className="text-xs text-paper-dim">números dos últimos 30 dias</span>
        </div>
        {sites.length === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <NovoSite variante="vazio" />
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sites.map((site) => {
            const m = porSite.get(site.id) ?? zero();
            const [c1, c2] = capaDoSite(site.id);
            return (
              <div
                key={site.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-2 transition hover:-translate-y-1 hover:border-brand-2/50 hover:shadow-2xl"
              >
                <Link href={`/app/sites/${site.id}`} className="block">
                  <div
                    className="relative flex h-28 items-end p-4"
                    style={{
                      background: `linear-gradient(135deg, ${c1}, ${c2})`,
                    }}
                  >
                    <span
                      className="absolute inset-0 opacity-25"
                      style={{
                        background:
                          "radial-gradient(120% 80% at 90% 0%, rgba(255,255,255,.55), transparent 60%)",
                      }}
                    />
                    <span
                      className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur ${
                        site.publicado ? "bg-black/35 text-white" : "bg-black/45 text-white/80"
                      }`}
                    >
                      {site.publicado ? "● No ar" : "○ Rascunho"}
                    </span>
                    <span className="relative font-display text-xl font-extrabold text-white drop-shadow">
                      {site.nome}
                    </span>
                  </div>
                </Link>

                {/* métricas rápidas do site */}
                <div className="grid grid-cols-3 divide-x divide-white/8 border-b border-white/8">
                  {[
                    { rot: "visitas", val: m.visitas, cor: "text-paper" },
                    { rot: "cliques", val: m.cliques, cor: "text-brand-2" },
                    { rot: "leads", val: m.leads, cor: "text-ok" },
                  ].map((x) => (
                    <div key={x.rot} className="px-2 py-3 text-center">
                      <div className={`text-lg font-extrabold tabular-nums ${x.cor}`}>{x.val}</div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-paper-dim">
                        {x.rot}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2 px-4 py-3">
                  <span className="min-w-0 truncate text-xs text-paper-dim">
                    {site.slug}
                    {ROOT ? `.${ROOT}` : ""}
                  </span>
                  <span className="flex flex-none gap-1">
                    <Link
                      href={`/app/sites/${site.id}/metricas`}
                      title="Métricas"
                      className="rounded-lg px-2 py-1 text-sm text-paper-dim transition hover:bg-white/10 hover:text-paper"
                    >
                      📊
                    </Link>
                    <Link
                      href={`/app/sites/${site.id}`}
                      className="rounded-lg bg-brand/15 px-3 py-1 text-xs font-bold text-brand-2 transition hover:bg-brand hover:text-white"
                    >
                      Abrir
                    </Link>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
