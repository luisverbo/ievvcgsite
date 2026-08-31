import Link from "next/link";
import { redirect } from "next/navigation";
import { getMinhaOrg } from "@/lib/painel/queries";
import { PLANOS } from "@/lib/painel/permissoes";
import Vigia from "../prospeccao/Vigia";
import Robo from "@/components/painel/Robo";

export const dynamic = "force-dynamic";

/*
 * A tela em que o cliente cai VINDO DA STRIPE, logo depois de pagar.
 *
 * Antes o checkout devolvia direto para /app/assinatura, e havia uma corrida
 * que o cliente podia perder: o navegador volta em um instante, o webhook da
 * Stripe (que é quem libera o plano) leva alguns segundos. Quem chegava
 * primeiro lia "escolha seu plano: Pro ou Agência" — a vitrine — segundos
 * depois de ter pago. Não dá para imaginar pior momento para uma dúvida.
 *
 * Esta tela existe para segurar esses segundos com a verdade: o pagamento
 * foi recebido, o acesso está sendo liberado. Ela se atualiza sozinha e, no
 * instante em que o plano vira, mostra o caminho certo para cada produto.
 */
export default async function PagamentoPage() {
  const org = await getMinhaOrg();
  if (!org) redirect("/app/onboarding");

  const plano = (org.plano ?? "free") as string;
  const liberado = plano !== "free";
  const prospector = plano === "prospector";
  const rotulo = (PLANOS as Record<string, { rotulo?: string }>)[plano]?.rotulo ?? plano;

  return (
    <div className="painel-wrap flex max-w-2xl flex-col gap-6">
      {/* Só enquanto espera: liberado, não há mais o que vigiar. */}
      {!liberado && <Vigia modo="esperando" />}

      {liberado ? (
        <div className="anim-entrada rounded-2xl border border-ok/40 bg-ok/10 p-7 text-center">
          <div className="mx-auto w-fit">
            <Robo
              estado="trabalhando"
              tamanho={88}
              {...(prospector ? { cor: "#4285F4", corClara: "#8ab4f8" } : {})}
            />
          </div>
          <h1 className="mt-4 font-display text-3xl font-extrabold text-ok">
            Pagamento confirmado 🎉
          </h1>
          <p className="mt-2 text-sm text-paper">
            Seu plano <b className="text-paper">{rotulo}</b> está ativo. Bem-vindo!
          </p>

          {prospector ? (
            <>
              <p className="mx-auto mt-4 max-w-md text-sm text-paper-dim">
                Falta uma coisa só, e é rápida: instalar o seu agente. São quatro passos, uma vez
                só — depois disso ele liga junto com o computador e você nunca mais mexe nisso.
              </p>
              <Link
                href="/app/comecar"
                className="mt-5 inline-flex rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-brand-2"
              >
                Começar a instalação →
              </Link>
            </>
          ) : (
            <>
              <p className="mx-auto mt-4 max-w-md text-sm text-paper-dim">
                Tudo já está liberado no painel. Comece criando sua primeira página.
              </p>
              <Link
                href="/app"
                className="mt-5 inline-flex rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-brand-2"
              >
                Ir para o painel →
              </Link>
            </>
          )}

          <p className="mt-5 text-xs text-paper-dim">
            A nota e as próximas faturas ficam em{" "}
            <Link href="/app/assinatura" className="underline underline-offset-2 hover:text-paper">
              Assinatura
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="anim-entrada rounded-2xl border border-brand-2/40 bg-brand/10 p-7 text-center">
          <div className="mx-auto w-fit">
            <Robo estado="dormindo" tamanho={88} />
          </div>
          <h1 className="mt-4 font-display text-3xl font-extrabold text-paper">
            Pagamento recebido ✓
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-paper">
            Estamos liberando o seu acesso — leva alguns segundos. Esta tela se atualiza sozinha,
            não precisa fazer nada.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-brand-2">
            Liberando
            <span className="pp-pontinhos text-brand-2">
              <span />
              <span />
              <span />
            </span>
          </p>
          <p className="mx-auto mt-6 max-w-md text-xs text-paper-dim">
            Passou de um minuto e nada mudou? Sua cobrança está registrada na Stripe e nada se
            perde — abra a{" "}
            <Link href="/app/assinatura" className="underline underline-offset-2 hover:text-paper">
              tela de assinatura
            </Link>{" "}
            ou fale com o suporte que a gente libera na mão.
          </p>
        </div>
      )}
    </div>
  );
}
