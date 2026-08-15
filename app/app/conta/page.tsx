import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { PLANOS, planoVigente } from "@/lib/painel/permissoes";
import { situacaoDaAssinatura, type AssinaturaRow } from "@/lib/pagamentos/estado";
import { createAdminClient } from "@/lib/supabase/admin";
import { statusDaConta } from "@/lib/creditos/conta";
import { emDolar } from "@/lib/creditos/precos";
import { cardClass } from "@/components/painel/ui";
import { FormNome, FormEmail, FormSenha } from "./FormsConta";
import { sair } from "../actions";

export const dynamic = "force-dynamic";

export default async function ContaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getMinhaOrg();
  if (!org) redirect("/app/onboarding");

  const admin = createAdminClient();
  const [plano, conta, { data: assRow }] = await Promise.all([
    planoVigente(org.id, org.plano),
    statusDaConta(org.id),
    admin
      .from("assinaturas")
      .select("plano, pago_ate, status, falhou_em")
      .eq("org_id", org.id)
      .maybeSingle(),
  ]);
  const s = situacaoDaAssinatura((assRow as AssinaturaRow | null) ?? null);
  const nomePessoa = String((user.user_metadata as { nome?: string } | null)?.nome ?? "");

  const desde = user.created_at
    ? new Date(user.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="painel-wrap flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/app" className="text-sm text-paper-dim hover:text-paper">
          ← Painel
        </Link>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Minha conta 👤</h1>
        <p className="mt-1 text-sm text-paper-dim">
          Seus dados de acesso e o resumo da sua assinatura.
        </p>
      </div>

      {/* resumo — o que ele quer conferir de relance */}
      <div className={`anim-entrada d1 ${cardClass}`}>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-paper-dim">Plano</p>
            <p className="mt-1 font-bold text-paper">{PLANOS[plano]?.rotulo ?? plano}</p>
            <Link
              href="/app/assinatura"
              className="text-xs font-semibold text-brand-2 hover:underline"
            >
              ver assinatura →
            </Link>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-paper-dim">
              Crédito de IA
            </p>
            <p className="mt-1 font-bold text-paper">
              {conta.fonte === "propria" ? "chave própria" : emDolar(conta.saldo)}
            </p>
            <Link
              href="/app/creditos"
              className="text-xs font-semibold text-brand-2 hover:underline"
            >
              gerenciar →
            </Link>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-paper-dim">
              Cliente desde
            </p>
            <p className="mt-1 font-bold text-paper">{desde ?? "—"}</p>
          </div>
        </div>
        {s.aviso && (
          <p
            className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
              s.status === "atrasada"
                ? "border-warn/40 bg-warn/10 text-warn"
                : "border-danger/40 bg-danger/10 text-danger"
            }`}
          >
            {s.aviso}{" "}
            <Link href="/app/assinatura" className="font-bold underline underline-offset-2">
              Resolver
            </Link>
          </p>
        )}
      </div>

      <FormNome nomePessoa={nomePessoa} nomeOrg={org.nome} />
      <FormEmail emailAtual={user.email ?? ""} />
      <FormSenha />

      {/* encerrar sessão e caminho para cancelar — sem esconder nada */}
      <div className={cardClass}>
        <h2 className="text-lg font-bold">Sair e cancelamento</h2>
        <p className="mt-1 text-sm text-paper-dim">
          Para cancelar a assinatura, use{" "}
          <Link href="/app/assinatura" className="font-semibold text-brand-2 hover:underline">
            Assinatura → Cartão e faturas
          </Link>{" "}
          — o cancelamento é em dois cliques, e o que você já pagou vale até o fim do mês. Suas
          páginas e domínios continuam salvos.
        </p>
        <form action={sair} className="mt-4">
          <button
            type="submit"
            className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-bold text-paper transition hover:border-danger hover:text-danger"
          >
            Sair desta conta
          </button>
        </form>
      </div>
    </div>
  );
}
