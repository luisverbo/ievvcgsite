import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { alterarPlano, ehAdmin } from "./actions";
import CriarLanding from "./CriarLanding";
import ChaveAnthropic from "./ChaveAnthropic";
import Diagnostico from "./Diagnostico";
import ChaveForm from "./ebooks/ChaveForm";
import { getAnthropicKey } from "@/lib/ia/anthropic";
import { getOpenAIKey } from "@/lib/ebooks/openai";
import { PLANOS } from "@/lib/painel/permissoes";
import { emDolar } from "@/lib/creditos/precos";
import { cardClass } from "@/components/painel/ui";

// Painel do dono do sistema: ferramentas de IA, chaves e visão das contas.
// Acesso restrito ao email em ADMIN_EMAIL (variável de ambiente).

type Plano = "free" | "pro" | "agencia";
type OrgRow = { id: string; nome: string; plano: Plano; created_at: string };

export default async function AdminPage() {
  if (!(await ehAdmin())) notFound();

  const admin = createAdminClient();

  const [
    { data: orgsRaw },
    { data: sitesRaw },
    { data: membrosRaw },
    usersRes,
    chaveIA,
    chaveOpenAI,
    { count: totalPaginasIA },
    { count: totalEbooks },
    { count: totalProspectos },
  ] = await Promise.all([
    admin.from("organizacoes").select("id, nome, plano, created_at").order("created_at"),
    admin.from("sites").select("org_id, publicado"),
    admin.from("membros").select("org_id, user_id"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
    getAnthropicKey(),
    getOpenAIKey(),
    admin.from("sites_ia").select("id", { count: "exact", head: true }),
    admin.from("ebooks").select("id", { count: "exact", head: true }),
    admin.from("prospeccao").select("id", { count: "exact", head: true }),
  ]);

  const orgs = (orgsRaw as OrgRow[] | null) ?? [];
  const sites = (sitesRaw as { org_id: string; publicado: boolean }[] | null) ?? [];
  const membros = (membrosRaw as { org_id: string; user_id: string }[] | null) ?? [];
  const emailPorUser = new Map(usersRes.data.users.map((u) => [u.id, u.email ?? "—"]));

  const sitesPorOrg = new Map<string, number>();
  for (const s of sites) sitesPorOrg.set(s.org_id, (sitesPorOrg.get(s.org_id) ?? 0) + 1);
  const donoPorOrg = new Map<string, string>();
  for (const m of membros) {
    if (!donoPorOrg.has(m.org_id)) donoPorOrg.set(m.org_id, emailPorUser.get(m.user_id) ?? "—");
  }

  const stats = [
    { rotulo: "Contas", valor: orgs.length, cor: "text-paper" },
    { rotulo: "Assinantes Pro", valor: orgs.filter((o) => o.plano === "pro").length, cor: "text-brand-2" },
    { rotulo: "Usuários", valor: usersRes.data.users.length, cor: "text-paper" },
    { rotulo: "Sites", valor: sites.length, cor: "text-paper" },
    { rotulo: "Sites no ar", valor: sites.filter((s) => s.publicado).length, cor: "text-ok" },
  ];

  // As duas ferramentas de IA, em destaque: é o que você abre todo dia.
  const ferramentas = [
    {
      href: "/app/ia",
      emoji: "✨",
      titulo: "Construtor de páginas",
      texto:
        "Descreva no chat e a Claude escreve o site inteiro — sem blocos, com liberdade total de layout, efeitos e animações. Aceita imagem e PDF de referência.",
      cta: "Abrir construtor",
      contagem: totalPaginasIA ?? 0,
      unidade: (totalPaginasIA ?? 0) === 1 ? "página criada" : "páginas criadas",
      gradiente: "linear-gradient(135deg,#6c5ce7,#a29bfe)",
      pronto: Boolean(chaveIA),
    },
    {
      href: "/app/admin/ebooks",
      emoji: "📖",
      titulo: "Ebooks IA",
      texto:
        "A Claude escreve e diagrama o ebook inteiro em formato de revista digital — cada página com layout próprio, e imagens só onde agregam.",
      cta: "Abrir gerador",
      contagem: totalEbooks ?? 0,
      unidade: (totalEbooks ?? 0) === 1 ? "ebook criado" : "ebooks criados",
      gradiente: "linear-gradient(135deg,#e8843c,#f5b76b)",
      pronto: Boolean(chaveIA),
    },
    {
      href: "/app/prospeccao",
      emoji: "🎯",
      titulo: "Prospecção",
      texto:
        "Encontra empresas por nicho e região e dá uma nota de potencial: quem não tem site pontua alto. Da lista você gera a página com um clique.",
      cta: "Buscar clientes",
      contagem: totalProspectos ?? 0,
      unidade: (totalProspectos ?? 0) === 1 ? "empresa na lista" : "empresas na lista",
      gradiente: "linear-gradient(135deg,#2fbf8f,#7ee0bd)",
      pronto: true, // busca gratuita, não depende de chave
    },
  ];

  return (
    <div className="painel-wrap flex flex-col gap-8">
      {/* --------------------------- cabeçalho --------------------------- */}
      <div>
        <h1 className="font-display text-3xl font-extrabold">Admin do sistema 👑</h1>
        <p className="mt-1 text-sm text-paper-dim">
          Suas ferramentas de IA, chaves de API e a visão de todas as contas. Só você (ADMIN_EMAIL)
          enxerga esta página.
        </p>
      </div>

      <Diagnostico />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div
            key={s.rotulo}
            className="rounded-xl border border-white/10 bg-ink-2 p-4 transition hover:border-white/20"
          >
            <div className={`text-2xl font-extrabold tabular-nums ${s.cor}`}>{s.valor}</div>
            <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-paper-dim">
              {s.rotulo}
            </div>
          </div>
        ))}
      </div>

      {/* -------------------------- ferramentas -------------------------- */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-paper-dim">
          Ferramentas de IA
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ferramentas.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-2 transition hover:-translate-y-1 hover:border-brand-2/50 hover:shadow-2xl"
            >
              <div
                className="relative flex h-24 items-end justify-between p-4"
                style={{ background: f.gradiente }}
              >
                <span
                  className="absolute inset-0 opacity-25"
                  style={{
                    background:
                      "radial-gradient(120% 80% at 90% 0%, rgba(255,255,255,.55), transparent 60%)",
                  }}
                />
                <span className="relative font-display text-xl font-extrabold text-white drop-shadow">
                  {f.emoji} {f.titulo}
                </span>
                <span className="relative rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
                  {f.contagem} {f.unidade}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-3 p-5">
                <p className="flex-1 text-sm text-paper-dim">{f.texto}</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white transition group-hover:bg-brand-2">
                    {f.cta}
                    <span className="transition group-hover:translate-x-0.5">→</span>
                  </span>
                  {!f.pronto && (
                    <span className="text-xs font-bold text-danger">⚠️ falta a chave</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ---------------------------- chaves ----------------------------- */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-paper-dim">
          Chaves de API
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className={cardClass}>
            <div className="mb-1 flex items-center gap-2">
              <h3 className="font-bold">Anthropic (Claude)</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  chaveIA ? "bg-ok/20 text-ok" : "bg-danger/20 text-danger"
                }`}
              >
                {chaveIA ? "configurada" : "faltando"}
              </span>
            </div>
            <p className="mb-4 text-sm text-paper-dim">
              Escreve as páginas e os ebooks. Pegue em{" "}
              <span className="text-paper">console.anthropic.com → API Keys</span>.
            </p>
            <ChaveAnthropic temChave={Boolean(chaveIA)} />
          </div>

          <div className={cardClass}>
            <div className="mb-1 flex items-center gap-2">
              <h3 className="font-bold">OpenAI</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  chaveOpenAI ? "bg-ok/20 text-ok" : "bg-white/10 text-paper-dim"
                }`}
              >
                {chaveOpenAI ? "configurada" : "opcional"}
              </span>
            </div>
            <p className="mb-4 text-sm text-paper-dim">
              Só para gerar as <span className="text-paper">imagens</span> das páginas e dos ebooks.
              Sem ela tudo funciona, mas sem fotos.
            </p>
            <ChaveForm temChave={Boolean(chaveOpenAI)} />
          </div>
        </div>
        <p className="mt-2 text-xs text-paper-dim">
          As duas ficam guardadas só no servidor e nunca aparecem no navegador.
        </p>
      </div>

      {/* ------------------------- landing page -------------------------- */}
      <div className={cardClass}>
        <h2 className="mb-1 text-lg font-bold">Landing page do produto</h2>
        <p className="mb-4 text-sm text-paper-dim">
          Cria o site <b className="text-paper">“PáginaPro”</b> na sua conta com 3 páginas prontas:{" "}
          <b className="text-paper">/</b> (venda com os 3 planos),{" "}
          <b className="text-paper">/teste-gratis</b> (entrada no trial de 7 dias) e{" "}
          <b className="text-paper">/comecar</b> (oferta única do Básico). Depois é só editar
          preços, depoimentos e textos no editor visual — como qualquer site seu.
        </p>
        <CriarLanding />
      </div>

      {/* ---------------------------- contas ----------------------------- */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-paper-dim">
          Contas ({orgs.length})
        </h2>
        <div className={`${cardClass} p-0`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-paper-dim">
                  <th className="px-5 py-3">Conta</th>
                  <th className="px-5 py-3">Sites</th>
                  <th className="px-5 py-3">Criada em</th>
                  <th className="px-5 py-3">Plano</th>
                  <th className="px-5 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orgs.map((org) => {
                  const dono = donoPorOrg.get(org.id) ?? "—";
                  return (
                    <tr key={org.id} className="transition hover:bg-white/[0.03]">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand/25 text-sm font-extrabold text-brand-2">
                            {org.nome.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{org.nome}</div>
                            <div className="truncate text-xs text-paper-dim">{dono}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 tabular-nums">{sitesPorOrg.get(org.id) ?? 0}</td>
                      <td className="px-5 py-3.5 text-paper-dim">
                        {new Date(org.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            org.plano === "agencia"
                              ? "bg-ok/20 text-ok"
                              : org.plano === "pro"
                                ? "bg-brand/25 text-brand-2"
                                : "bg-white/10 text-paper-dim"
                          }`}
                        >
                          {PLANOS[org.plano]?.rotulo ?? org.plano}
                        </span>
                        <div className="mt-0.5 text-[11px] text-paper-dim">
                          {emDolar(PLANOS[org.plano]?.cota ?? 0)}/mês de IA
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {/* Um botão por plano: com três planos, alternar num
                            botão só vira adivinhação de para onde ele vai. */}
                        <div className="flex justify-end gap-1.5">
                          {(["free", "pro", "agencia"] as Plano[]).map((alvo) => (
                            <form key={alvo} action={alterarPlano.bind(null, org.id, alvo)}>
                              <button
                                type="submit"
                                disabled={org.plano === alvo}
                                className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                                  org.plano === alvo
                                    ? "border-white/10 text-paper-dim/40"
                                    : "border-white/15 text-paper-dim hover:border-brand-2 hover:text-brand-2"
                                }`}
                              >
                                {PLANOS[alvo].rotulo}
                              </button>
                            </form>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-paper-dim">
        💳 Cobrança automática (Stripe: checkout, webhook e cancelamento pelo cliente) entra na Fase
        4. Por enquanto você ativa/desativa o plano Pro manualmente aqui, depois de receber o
        pagamento (ex: Pix).
      </p>
    </div>
  );
}
