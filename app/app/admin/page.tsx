import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { alterarPlano, ehAdmin } from "./actions";
import CriarLanding from "./CriarLanding";
import ChaveAnthropic from "./ChaveAnthropic";
import { getAnthropicKey } from "@/lib/ia/anthropic";
import { cardClass } from "@/components/painel/ui";

// Painel do dono do sistema: visão de todas as contas + troca de plano.
// Acesso restrito ao email em ADMIN_EMAIL (variável de ambiente).

type OrgRow = { id: string; nome: string; plano: "free" | "pro"; created_at: string };

export default async function AdminPage() {
  if (!(await ehAdmin())) notFound();

  const admin = createAdminClient();

  const [{ data: orgsRaw }, { data: sitesRaw }, { data: membrosRaw }, usersRes, chaveIA] =
    await Promise.all([
      admin.from("organizacoes").select("id, nome, plano, created_at").order("created_at"),
      admin.from("sites").select("org_id, publicado"),
      admin.from("membros").select("org_id, user_id"),
      admin.auth.admin.listUsers({ perPage: 1000 }),
      getAnthropicKey(),
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

  const totais = {
    contas: orgs.length,
    pro: orgs.filter((o) => o.plano === "pro").length,
    sites: sites.length,
    publicados: sites.filter((s) => s.publicado).length,
    usuarios: usersRes.data.users.length,
  };

  return (
    <div className="painel-wrap flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Admin do sistema 👑</h1>
        <p className="mt-1 text-sm text-paper-dim">
          Visão geral de todas as contas. Só você (ADMIN_EMAIL) enxerga esta página.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { rotulo: "Contas", valor: totais.contas },
          { rotulo: "Assinantes Pro", valor: totais.pro },
          { rotulo: "Usuários", valor: totais.usuarios },
          { rotulo: "Sites", valor: totais.sites },
          { rotulo: "Sites no ar", valor: totais.publicados },
        ].map((s) => (
          <div key={s.rotulo} className="rounded-xl border border-white/10 bg-ink-2 p-4">
            <div className="text-2xl font-extrabold">{s.valor}</div>
            <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-paper-dim">
              {s.rotulo}
            </div>
          </div>
        ))}
      </div>

      <div className={cardClass}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="mb-1 text-lg font-bold">Construtor de páginas com IA ✨</h2>
            <p className="text-sm text-paper-dim">
              Descreva a página no chat e o Claude escreve o site inteiro — sem blocos, com
              liberdade total de layout, efeitos e animações. Aceita imagem e PDF de referência.
            </p>
          </div>
          <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-paper-dim">
            só para o dono
          </span>
        </div>
        <label className="mb-1.5 block text-sm font-medium text-paper-dim">
          Chave da API da Anthropic
        </label>
        <ChaveAnthropic temChave={Boolean(chaveIA)} />
        <p className="mt-2 text-xs text-paper-dim">
          Pegue em console.anthropic.com → API Keys. Fica guardada só no servidor e nunca aparece
          no navegador.
        </p>
      </div>

      <div className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="mb-1 text-lg font-bold">Ebooks IA 📖</h2>
            <p className="text-sm text-paper-dim">
              Crie ebooks em formato revista digital com um prompt — texto e imagens por IA
              (OpenAI), com escolha de formato e número de páginas.
            </p>
          </div>
          <Link
            href="/app/admin/ebooks"
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2"
          >
            Abrir gerador
          </Link>
        </div>
      </div>

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

      <div className={cardClass}>
        <h2 className="mb-4 text-lg font-bold">Contas</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-paper-dim">
                <th className="py-2 pr-4">Conta</th>
                <th className="py-2 pr-4">Dono</th>
                <th className="py-2 pr-4">Sites</th>
                <th className="py-2 pr-4">Criada em</th>
                <th className="py-2 pr-4">Plano</th>
                <th className="py-2">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orgs.map((org) => (
                <tr key={org.id}>
                  <td className="py-3 pr-4 font-semibold">{org.nome}</td>
                  <td className="py-3 pr-4 text-paper-dim">{donoPorOrg.get(org.id) ?? "—"}</td>
                  <td className="py-3 pr-4">{sitesPorOrg.get(org.id) ?? 0}</td>
                  <td className="py-3 pr-4 text-paper-dim">
                    {new Date(org.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        org.plano === "pro" ? "bg-brand/25 text-brand-2" : "bg-white/10 text-paper-dim"
                      }`}
                    >
                      {org.plano === "pro" ? "Pro" : "Grátis"}
                    </span>
                  </td>
                  <td className="py-3">
                    <form
                      action={alterarPlano.bind(null, org.id, org.plano === "pro" ? "free" : "pro")}
                    >
                      <button
                        type="submit"
                        className={`rounded-lg border px-3 py-1 text-xs font-bold transition ${
                          org.plano === "pro"
                            ? "border-white/15 text-paper-dim hover:border-danger hover:text-danger"
                            : "border-brand-2/50 text-brand-2 hover:bg-brand/10"
                        }`}
                      >
                        {org.plano === "pro" ? "Rebaixar para Grátis" : "Ativar Pro"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-paper-dim">
        💳 Cobrança automática (Stripe: checkout, webhook e cancelamento pelo cliente) entra na
        Fase 4. Por enquanto você ativa/desativa o plano Pro manualmente aqui após receber o
        pagamento (ex: Pix).
      </p>
    </div>
  );
}
