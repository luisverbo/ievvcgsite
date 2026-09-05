import Link from "next/link";
import { headers } from "next/headers";
import type { Metadata } from "next";
import AuthForm from "../login/AuthForm";
import Marca, { ehFunilProspector, ehHostProspector } from "../login/Marca";
import { cadastrar } from "../login/actions";
import Analytics from "@/components/site/Analytics";
import { ORG_VENDAS, PAGINA_VENDAS } from "@/lib/vendas-metricas";

import { planoVendidoValido, precoEmReais } from "@/lib/pagamentos/planos";

const ROTULO: Record<string, string> = { pro: "Pro", agencia: "Agência", prospector: "Prospector" };

type Busca = Promise<{ plano?: string }>;

async function contexto(searchParams: Busca) {
  const { plano: bruto } = await searchParams;
  /*
   * No domínio do Prospector não existe "conta grátis para criar sites": só
   * se vende uma coisa ali. Sem ?plano na URL o plano é o Prospector — senão
   * a pessoa criaria a conta e cairia num painel que não é o que comprou.
   */
  const noHostProspector = ehHostProspector((await headers()).get("host"));
  // ?plano=teste: o teste grátis de 7 dias do Prospector. Não é plano vendido
  // (não passa pela Stripe), então anda numa variável própria.
  const teste = bruto === "teste";
  const plano = teste ? null : planoVendidoValido(bruto ?? (noHostProspector ? "prospector" : ""));
  const prospector = ehFunilProspector({ plano: bruto }) || noHostProspector;
  return { plano, prospector, teste };
}

/*
 * O título da aba acompanha o funil. "PáginaPro — Landing pages e funis"
 * na aba de quem acabou de clicar em "assinar o Prospector" é o primeiro
 * sinal de que algo não bate — e quem desconfia nessa tela fecha a aba.
 */
export async function generateMetadata({ searchParams }: { searchParams: Busca }): Promise<Metadata> {
  const { prospector } = await contexto(searchParams);
  return prospector
    ? { title: "Prospector — Crie sua conta" }
    : { title: "PáginaPro — Crie sua conta" };
}

export default async function CadastroPage({ searchParams }: { searchParams: Busca }) {
  const { plano, prospector, teste } = await contexto(searchParams);
  const preco = plano ? precoEmReais(plano) : null;
  // Para onde a conta vai depois de criada: pagar, ativar o teste, ou o painel.
  const destino = teste ? "/assinar/teste" : plano ? `/assinar/${plano}` : undefined;
  const suporte = (process.env.NEXT_PUBLIC_WHATSAPP_VENDAS ?? "").replace(/\D/g, "");

  return (
    <div className={`${prospector ? "tema-prospector " : ""}flex min-h-screen items-center justify-center px-5 py-10`}>
      {/* "Iniciou cadastro" no funil: a visita a esta tela, na landing certa. */}
      <Analytics
        orgId={ORG_VENDAS}
        siteId={prospector ? PAGINA_VENDAS.prospector : PAGINA_VENDAS.principal}
      />

      <div className="grid w-full max-w-3xl gap-6 md:grid-cols-[1fr_17rem]">
        {/* ------------------------- o formulário ------------------------- */}
        <div className="rounded-2xl border border-white/10 bg-ink-2 p-8">
          <Marca prospector={prospector} />

          {plano && (
            /*
             * "Etapa 1 de 2": quem sabe que falta só mais uma tela não
             * abandona no meio. É a diferença entre um formulário e um
             * caminho.
             */
            <div className="mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-paper-dim">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[11px] text-white">1</span>
              <span className="text-paper">Criar conta</span>
              <span className="mx-1 h-px w-6 bg-white/20" />
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-[11px]">2</span>
              <span>Pagamento</span>
            </div>
          )}

          <h1 className="mt-4 font-display text-2xl font-extrabold">
            {teste ? "Comece seu teste grátis" : plano ? "Crie sua conta" : "Crie sua conta grátis"}
          </h1>
          <p className="mb-6 mt-1.5 text-sm text-paper-dim">
            {teste
              ? "Sete dias com o Prospector inteiro, sem cartão. Leva vinte segundos: crie a conta e o painel já abre no passo a passo."
              : prospector
                ? "Leva vinte segundos. Na próxima etapa você escolhe a forma de pagamento e o Prospector já fica ativo."
                : plano
                  ? `Na próxima etapa você paga o plano ${ROTULO[plano]} e o painel já fica liberado.`
                  : "Publique sua primeira página em minutos."}
          </p>

          <AuthForm
            action={cadastrar}
            submitLabel={
              teste ? "Começar meu teste grátis →" : plano ? "Continuar para o pagamento →" : "Criar conta grátis"
            }
            de={destino}
          />

          {plano && (
            <p className="mt-3 text-xs text-paper-dim">
              A senha é para você entrar no painel depois — o pagamento é na próxima tela, não aqui.
            </p>
          )}
          {teste && (
            <p className="mt-3 text-xs text-paper-dim">
              Não pedimos cartão. Quando os 7 dias acabarem, você decide se assina — nada é cobrado
              sozinho.
            </p>
          )}

          <p className="mt-6 text-sm text-paper-dim">
            Já tem conta?{" "}
            <Link
              href={destino ? `/login?de=${encodeURIComponent(destino)}` : "/login"}
              className="font-semibold text-brand-2 hover:underline"
            >
              Entrar
            </Link>
          </p>
        </div>

        {/* ------------------------- o resumo da compra ------------------- */}
        {/*
          O que a pessoa está comprando, ao lado do formulário. Repetir o
          preço e a garantia logo antes de pedir e-mail e senha derruba o
          "quanto era mesmo?" que faz a pessoa voltar — e voltar é onde a
          venda se perde.
        */}
        {/* O resumo do teste: o que ganha, o que limita, o que NÃO acontece (cobrança). */}
        {teste && (
          <aside className="flex flex-col gap-4 rounded-2xl border border-warn/30 bg-ink-2 p-6 text-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-paper-dim">Seu teste</p>
              <p className="mt-1 font-display text-xl font-extrabold text-paper">Prospector · 7 dias</p>
              <p className="mt-1 font-display text-3xl font-extrabold text-paper">
                R$ 0<span className="text-sm font-bold text-paper-dim"> por 7 dias</span>
              </p>
            </div>
            <ul className="flex flex-col gap-2 text-paper-dim">
              <li className="flex gap-2"><span className="text-ok">✓</span> Agente, WhatsApp, funil e remarketing</li>
              <li className="flex gap-2"><span className="text-ok">✓</span> Até 30 empresas encontradas por dia</li>
              <li className="flex gap-2"><span className="text-ok">✓</span> Até 30 mensagens por dia</li>
              <li className="flex gap-2"><span className="text-ok">✓</span> Sem cartão, sem cobrança automática</li>
            </ul>
            <div className="border-t border-white/10 pt-4 text-xs text-paper-dim">
              <p>
                Gostou? Assina por R$ {precoEmReais("prospector")}/mês pelo painel e o teto some na
                hora. Não gostou? A conta simplesmente para de prospectar.
              </p>
            </div>
          </aside>
        )}

        {plano && preco && (
          <aside className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-ink-2 p-6 text-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-paper-dim">Seu plano</p>
              <p className="mt-1 font-display text-xl font-extrabold text-paper">{ROTULO[plano]}</p>
              <p className="mt-1 font-display text-3xl font-extrabold text-paper">
                R$ {preco}
                <span className="text-sm font-bold text-paper-dim">/mês</span>
              </p>
            </div>
            <ul className="flex flex-col gap-2 text-paper-dim">
              <li className="flex gap-2"><span className="text-ok">✓</span> Sem fidelidade</li>
              <li className="flex gap-2"><span className="text-ok">✓</span> 7 dias de garantia</li>
              <li className="flex gap-2"><span className="text-ok">✓</span> Cancele direto no painel</li>
              {prospector && (
                <li className="flex gap-2"><span className="text-ok">✓</span> Sem cobrança por lead</li>
              )}
            </ul>
            <div className="border-t border-white/10 pt-4 text-xs text-paper-dim">
              <p className="flex items-center gap-2">
                <span>🔒</span> Pagamento seguro pela Stripe. Seus dados de cartão nunca passam por
                aqui.
              </p>
              {suporte && (
                <p className="mt-3">
                  Alguma dúvida?{" "}
                  <a
                    href={`https://wa.me/${suporte}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-brand-2 hover:underline"
                  >
                    Fale com a gente no WhatsApp
                  </a>
                </p>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
