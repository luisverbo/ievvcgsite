import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { PLANOS, planoVigente, planoLibera } from "@/lib/painel/permissoes";
import { ehAdmin } from "@/lib/painel/admin";
import { situacaoDaAssinatura, type AssinaturaRow } from "@/lib/pagamentos/estado";
import { statusDaConta } from "@/lib/creditos/conta";
import { emDolar } from "@/lib/creditos/precos";

/*
 * A home do painel — a visão do CLIENTE.
 *
 * Uma pergunta guia a tela inteira: "abri o painel, e agora?". Por isso ela
 * tem três andares, nesta ordem:
 *
 *   1. o que precisa de atenção AGORA (pagamento atrasado);
 *   2. como está o negócio dele (páginas, visitas, crédito);
 *   3. para onde ir (as áreas, cada uma explicada em uma frase).
 *
 * O construtor por blocos não aparece: é ferramenta interna, mora em
 * /app/sites e só o admin enxerga.
 */

function desde30Dias() {
  return new Date(Date.now() - 30 * 86_400_000).toISOString();
}

type PaginaIA = {
  id: string;
  titulo: string;
  slug: string;
  publicado: boolean;
  html: string | null;
  updated_at: string;
};

export default async function PainelHome() {
  const org = await getMinhaOrg();
  if (!org) redirect("/app/onboarding");

  const supabase = await createClient();
  const [plano, admin, conta, assinaturaRes, paginasRes, visitasRes] = await Promise.all([
    planoVigente(org.id, org.plano),
    ehAdmin(),
    statusDaConta(org.id),
    supabase
      .from("assinaturas")
      .select("plano, pago_ate, status, falhou_em")
      .eq("org_id", org.id)
      .maybeSingle(),
    supabase
      .from("sites_ia")
      .select("id, titulo, slug, publicado, html, updated_at")
      .eq("org_id", org.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("analytics_eventos")
      .select("id", { count: "exact", head: true })
      .eq("org_id", org.id)
      .eq("tipo", "pageview")
      .gte("created_at", desde30Dias()),
  ]);

  const situacao = situacaoDaAssinatura((assinaturaRes.data as AssinaturaRow | null) ?? null);
  const paginas = (paginasRes.data as PaginaIA[] | null) ?? [];
  const noAr = paginas.filter((p) => p.publicado).length;
  const visitas30d = visitasRes.count ?? 0;
  const recentes = paginas.slice(0, 3);

  const temProspeccao = admin || planoLibera(plano, "prospeccao");

  // Prospecção só é consultada para quem tem o recurso — senão é banco à toa.
  let empresas = 0;
  let agenteOnline = false;
  if (temProspeccao) {
    const [{ count }, { data: ag }] = await Promise.all([
      supabase.from("prospeccao").select("id", { count: "exact", head: true }).eq("org_id", org.id),
      supabase
        .from("agentes")
        .select("ultimo_contato")
        .eq("org_id", org.id)
        .order("ultimo_contato", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    empresas = count ?? 0;
    const ultimo = (ag as { ultimo_contato: string | null } | null)?.ultimo_contato;
    agenteOnline = !!ultimo && Date.now() - new Date(ultimo).getTime() < 15 * 60_000;
  }

  const stats = [
    { rotulo: "Páginas criadas", valor: String(paginas.length) },
    { rotulo: "No ar", valor: String(noAr) },
    { rotulo: "Visitas (30 dias)", valor: String(visitas30d) },
    {
      rotulo: "Crédito de IA",
      valor: conta.fonte === "propria" ? "chave própria" : emDolar(conta.saldo),
    },
  ];

  return (
    <div className="painel-wrap flex flex-col gap-8">
      {/* quem é, em que plano está */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{org.nome}</h1>
          <p className="mt-1 text-sm text-paper-dim">
            Plano{" "}
            <span className="rounded-full bg-brand/20 px-2 py-0.5 text-xs font-bold text-brand-2">
              {PLANOS[plano]?.rotulo ?? plano}
            </span>
          </p>
        </div>
        <Link
          href="/app/ia"
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-2"
        >
          + Criar página com IA
        </Link>
      </div>

      {/* o que precisa de atenção agora */}
      {situacao.aviso && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            situacao.status === "atrasada"
              ? "border-warn/40 bg-warn/10 text-warn"
              : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {situacao.aviso}{" "}
          <Link href="/app/assinatura" className="font-bold underline underline-offset-2">
            Resolver agora
          </Link>
        </div>
      )}

      {/* como está o negócio */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.rotulo} className="rounded-xl border border-white/10 bg-ink-2 p-4">
            <div className="text-2xl font-extrabold tabular-nums">{s.valor}</div>
            <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-paper-dim">
              {s.rotulo}
            </div>
          </div>
        ))}
      </div>

      {/* continuar de onde parou */}
      {recentes.length > 0 && (
        <div>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-paper-dim">
              Continuar de onde parou
            </h2>
            <Link href="/app/ia" className="text-xs font-semibold text-brand-2 hover:underline">
              ver todas as páginas →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {recentes.map((p) => (
              <Link
                key={p.id}
                href={`/app/ia/${p.id}`}
                className="group rounded-xl border border-white/10 bg-ink-2 p-4 transition hover:-translate-y-0.5 hover:border-brand-2/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-bold text-paper">{p.titulo}</span>
                  <span
                    className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      p.publicado ? "bg-ok/15 text-ok" : "bg-white/10 text-paper-dim"
                    }`}
                  >
                    {p.publicado ? "no ar" : p.html ? "rascunho" : "vazia"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-paper-dim">
                  atualizada em {new Date(p.updated_at).toLocaleDateString("pt-BR")}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* para onde ir */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-paper-dim">
          Suas ferramentas
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/app/ia"
            className="group rounded-2xl border border-brand-2/30 bg-gradient-to-br from-brand/15 to-transparent p-5 transition hover:-translate-y-0.5 hover:border-brand-2/60"
          >
            <div className="text-2xl">✨</div>
            <h3 className="mt-2 font-display text-lg font-extrabold text-paper">
              Criador de páginas com IA
            </h3>
            <p className="mt-1 text-sm text-paper-dim">
              Descreva o negócio e a IA escreve a página inteira — texto, design e imagens. Depois
              é conversar até ficar do seu jeito.
            </p>
          </Link>

          {temProspeccao ? (
            <Link
              href="/app/prospeccao"
              className="group rounded-2xl border border-white/10 bg-ink-2 p-5 transition hover:-translate-y-0.5 hover:border-brand-2/50"
            >
              <div className="flex items-start justify-between">
                <div className="text-2xl">🎯</div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    agenteOnline ? "bg-ok/15 text-ok" : "bg-white/10 text-paper-dim"
                  }`}
                >
                  {agenteOnline ? "● agente ligado" : "○ agente desligado"}
                </span>
              </div>
              <h3 className="mt-2 font-display text-lg font-extrabold text-paper">Prospecção</h3>
              <p className="mt-1 text-sm text-paper-dim">
                {empresas > 0
                  ? `${empresas} empresas encontradas. Ache quem ainda não tem site e aborde no WhatsApp.`
                  : "Encontre empresas sem site na sua cidade e aborde no WhatsApp — é seu vendedor automático."}
              </p>
            </Link>
          ) : (
            <Link
              href="/app/assinatura"
              className="group rounded-2xl border border-dashed border-white/15 bg-ink-2/60 p-5 transition hover:border-warn/50"
            >
              <div className="text-2xl opacity-60">🔒</div>
              <h3 className="mt-2 font-display text-lg font-extrabold text-paper-dim">
                Prospecção
              </h3>
              <p className="mt-1 text-sm text-paper-dim">
                Encontre empresas sem site e aborde no WhatsApp. Disponível no plano{" "}
                <span className="font-bold text-warn">Agência</span> — clique para conhecer.
              </p>
            </Link>
          )}

          <Link
            href="/app/creditos"
            className="group rounded-2xl border border-white/10 bg-ink-2 p-5 transition hover:-translate-y-0.5 hover:border-brand-2/50"
          >
            <div className="text-2xl">⚡</div>
            <h3 className="mt-2 font-display text-lg font-extrabold text-paper">Créditos de IA</h3>
            <p className="mt-1 text-sm text-paper-dim">
              {conta.fonte === "propria"
                ? "Você usa a sua própria chave da Anthropic — as gerações saem direto na sua conta."
                : `Saldo atual: ${emDolar(conta.saldo)}. Compre mais no cartão ou Pix, ou use a sua própria chave.`}
            </p>
          </Link>

          <Link
            href="/app/assinatura"
            className="group rounded-2xl border border-white/10 bg-ink-2 p-5 transition hover:-translate-y-0.5 hover:border-brand-2/50"
          >
            <div className="text-2xl">📄</div>
            <h3 className="mt-2 font-display text-lg font-extrabold text-paper">Assinatura</h3>
            <p className="mt-1 text-sm text-paper-dim">
              {situacao.status === "ativa"
                ? "Em dia. Veja faturas, troque o cartão ou gerencie o plano."
                : situacao.status === "atrasada"
                  ? "Pagamento pendente — resolva para não perder o acesso."
                  : "Veja os planos e assine para liberar todos os recursos."}
            </p>
          </Link>
        </div>
      </div>

      {/* ferramentas internas — só o dono enxerga */}
      {admin && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-warn">
            Ferramentas internas (só você vê)
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { href: "/app/sites", emoji: "🧱", titulo: "Sites por blocos" },
              { href: "/app/templates", emoji: "🗂️", titulo: "Templates" },
              { href: "/app/admin", emoji: "👑", titulo: "Admin" },
            ].map((f) => (
              <Link
                key={f.href}
                href={f.href}
                className="flex items-center gap-3 rounded-xl border border-warn/25 bg-warn/5 px-4 py-3 text-sm font-bold text-paper transition hover:border-warn/50"
              >
                <span>{f.emoji}</span>
                {f.titulo}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
