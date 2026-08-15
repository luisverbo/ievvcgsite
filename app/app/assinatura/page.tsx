import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMinhaOrg } from "@/lib/painel/queries";
import { assinar, abrirPortal, pixDaMensalidade, subirDePlano } from "./actions";
import CodigoPix from "./CodigoPix";
import { situacaoDaAssinatura, periodoDe, type AssinaturaRow } from "@/lib/pagamentos/estado";
import { PLANOS, sitesDoPlano } from "@/lib/painel/permissoes";
import { precoEmReais, planoVendidoValido, podeSubirPara } from "@/lib/pagamentos/planos";
import { emDolar } from "@/lib/creditos/precos";
import { cardClass } from "@/components/painel/ui";

export const dynamic = "force-dynamic";

export default async function AssinaturaPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string; cancelado?: string }>;
}) {
  const { erro, ok: aviso } = await searchParams;
  const org = await getMinhaOrg();
  if (!org) notFound();

  const admin = createAdminClient();
  const { data } = await admin
    .from("assinaturas")
    .select("plano, pago_ate, status, falhou_em, stripe_customer_id")
    .eq("org_id", org.id)
    .maybeSingle();
  const assinatura = data as (AssinaturaRow & { stripe_customer_id: string | null }) | null;
  const s = situacaoDaAssinatura(assinatura);

  const periodo = periodoDe(new Date());
  const { data: pixRow } = await admin
    .from("cobrancas_pix")
    .select("qr_code, qr_code_base64, expira_em, status")
    .eq("org_id", org.id)
    .eq("periodo", periodo)
    .eq("status", "pendente")
    .maybeSingle();
  const pix = pixRow as {
    qr_code: string | null;
    qr_code_base64: string | null;
    expira_em: string | null;
  } | null;

  const { data: hist } = await admin
    .from("pagamentos")
    .select("id, provedor, tipo, valor_centavos, descricao, created_at")
    .eq("org_id", org.id)
    .eq("status", "pago")
    .order("created_at", { ascending: false })
    .limit(12);
  const pagamentos =
    (hist as {
      id: string;
      provedor: string;
      tipo: string;
      valor_centavos: number;
      descricao: string;
      created_at: string;
    }[] | null) ?? [];

  const podePix = s.status === "atrasada" || s.status === "suspensa";

  // Quem está no Pro e em dia pode subir para o Agência aqui mesmo.
  const planoAtual = planoVendidoValido(assinatura?.plano ?? "") ?? "agencia";
  const podeSubir = s.liberado && podeSubirPara(planoAtual, "agencia");

  return (
    <div className="painel-wrap flex flex-col gap-6">
      <div>
        <Link href="/app" className="text-sm text-paper-dim hover:text-paper">
          ← Painel
        </Link>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Assinatura</h1>
      </div>

      {erro && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {erro}
        </p>
      )}
      {aviso && aviso !== "1" && (
        <p role="status" className="rounded-lg border border-ok/40 bg-ok/10 px-4 py-3 text-sm text-ok">
          {aviso}
        </p>
      )}

      {s.status === "nova" || s.status === "cancelada" ? (
        /*
         * Sem assinatura: a escolha dos planos. Dois cards, o Agência em
         * destaque — é o carro-chefe; o Pro existe para quem só quer criar e
         * hospedar, sem prospecção.
         */
        <div className="grid gap-4 md:grid-cols-2">
          <div className={cardClass}>
            <p className="text-sm font-bold text-paper">Pro</p>
            <p className="mt-2 font-display text-3xl font-extrabold">
              R$ {precoEmReais("pro")}
              <span className="text-base font-bold text-paper-dim">/mês</span>
            </p>
            <p className="mt-1 text-xs text-paper-dim">
              Para quem quer criar e hospedar os próprios sites.
            </p>
            <ul className="mt-4 flex flex-col gap-1.5 text-sm text-paper-dim">
              <li>✓ Páginas com IA ilimitadas, editadas no chat</li>
              <li>✓ {emDolar(PLANOS.pro.cota)} de crédito de IA por mês</li>
              <li>✓ Hospedagem de {sitesDoPlano("pro")} sites em domínio próprio</li>
              <li>✓ Fotos reais, métricas e pixel</li>
              <li className="text-paper-dim/60">✗ Prospecção e WhatsApp</li>
            </ul>
            <form action={assinar.bind(null, "pro")} className="mt-5">
              <button
                type="submit"
                className="w-full rounded-lg border border-white/15 px-5 py-2.5 text-sm font-bold text-paper transition hover:border-brand-2"
              >
                Assinar o Pro
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-brand-2/50 bg-gradient-to-br from-brand/15 to-transparent p-5">
            <p className="text-sm font-bold text-brand-2">Agência · mais completo</p>
            <p className="mt-2 font-display text-3xl font-extrabold">
              R$ {precoEmReais("agencia")}
              <span className="text-base font-bold text-paper-dim">/mês</span>
            </p>
            <p className="mt-1 text-xs text-paper-dim">
              Para quem vende site: o sistema encontra o cliente para você.
            </p>
            <ul className="mt-4 flex flex-col gap-1.5 text-sm text-paper-dim">
              <li className="font-semibold text-paper">✓ Tudo do Pro, e mais:</li>
              <li>✓ Prospecção no Google Maps com nota de potencial</li>
              <li>✓ Abordagem no WhatsApp (manual e automática)</li>
              <li>✓ Fotos do Instagram das empresas</li>
              <li>✓ Hospedagem de {sitesDoPlano("agencia")} sites em domínio próprio</li>
              <li>✓ {emDolar(PLANOS.agencia.cota)} de crédito de IA por mês</li>
            </ul>
            <form action={assinar.bind(null, "agencia")} className="mt-5">
              <button
                type="submit"
                className="w-full rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2"
              >
                Assinar o Agência
              </button>
            </form>
          </div>

          <p className="text-xs text-paper-dim md:col-span-2">
            Pagamento no cartão, renovando sozinho. Sem fidelidade: cancela pelo painel quando
            quiser, e o pago vale até o fim do mês. Site extra além da cota: R$ 29,90/mês.
          </p>
        </div>
      ) : (
        /* já tem assinatura: o estado dela e as ações */
        <div className={cardClass}>
          {s.status === "ativa" && (
            <>
              <p className="text-sm font-bold text-ok">✓ Assinatura ativa</p>
              <p className="mt-1 text-sm text-paper-dim">
                Plano {PLANOS[assinatura?.plano ?? "agencia"]?.rotulo} · renova automaticamente no
                cartão em{" "}
                {assinatura?.pago_ate
                  ? new Date(assinatura.pago_ate).toLocaleDateString("pt-BR")
                  : "—"}
                . Inclui {emDolar(PLANOS[assinatura?.plano ?? "agencia"]?.cota ?? 0)} de IA por mês.
              </p>
              {!podeSubir && (
                <p className="mt-1 text-xs text-paper-dim">
                  Quer mudar de plano? Fale com o suporte — a troca vale já na próxima fatura.
                </p>
              )}
            </>
          )}

          {s.status === "atrasada" && (
            <>
              <p className="text-sm font-bold text-warn">⚠️ Pagamento não passou</p>
              <p className="mt-1 text-sm text-paper-dim">{s.aviso}</p>
              <p className="mt-1 text-sm text-paper-dim">
                Até lá <b className="text-paper">nada sai do ar</b> — seus sites e os dos seus
                clientes continuam funcionando normalmente.
              </p>
            </>
          )}

          {s.status === "suspensa" && (
            <>
              <p className="text-sm font-bold text-danger">Assinatura suspensa</p>
              <p className="mt-1 text-sm text-paper-dim">{s.aviso}</p>
            </>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {s.status === "ativa" || s.status === "atrasada" ? (
              <form action={abrirPortal}>
                <button
                  type="submit"
                  className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-bold text-paper transition hover:border-brand-2"
                >
                  Trocar cartão / ver faturas
                </button>
              </form>
            ) : (
              /* suspensa: reativa o plano que ele já tinha contratado */
              <form
                action={assinar.bind(
                  null,
                  planoVendidoValido(assinatura?.plano ?? "") ?? "agencia",
                )}
              >
                <button
                  type="submit"
                  className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2"
                >
                  Reativar no cartão
                </button>
              </form>
            )}

            {podePix && !pix && (
              <form action={pixDaMensalidade}>
                <button
                  type="submit"
                  className="rounded-lg border border-ok/40 px-4 py-2.5 text-sm font-bold text-ok transition hover:bg-ok/10"
                >
                  Pagar este mês no Pix
                </button>
              </form>
            )}
          </div>

          {/* Por que Pix só aparece aqui: a resposta antes da pergunta. */}
          {podePix && (
            <p className="mt-3 text-xs text-paper-dim">
              A assinatura é sempre no cartão, porque é ela que renova sozinha. O Pix aparece só
              quando o cartão recusa, para você não ficar refém do banco — e assim que ele for
              confirmado, a cobrança do cartão deste mês é cancelada, sem risco de pagar duas vezes.
            </p>
          )}
        </div>
      )}

      {/*
        Convite ao upgrade — só para quem está no Pro e em dia.
        Fica FORA do card de estado para não competir com "trocar cartão":
        é oferta, não manutenção de conta.
      */}
      {podeSubir && (
        <div className="rounded-xl border border-brand-2/40 bg-gradient-to-br from-brand/15 to-transparent p-5">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="font-display text-lg font-extrabold text-paper">
              Subir para o Agência
            </h2>
            <span className="text-sm text-paper-dim">
              R$ {precoEmReais("agencia")}/mês
            </span>
          </div>
          <p className="mt-2 text-sm text-paper-dim">
            O que muda: o sistema passa a <b className="text-paper">encontrar clientes para você</b>{" "}
            — prospecção no Google Maps com nota de potencial, abordagem automática no WhatsApp e
            fotos do Instagram das empresas. Sua cota sobe de {sitesDoPlano("pro")} para{" "}
            {sitesDoPlano("agencia")} sites hospedados e o crédito de IA de{" "}
            {emDolar(PLANOS.pro.cota)} para {emDolar(PLANOS.agencia.cota)} por mês.
          </p>
          <form action={subirDePlano.bind(null, "agencia")} className="mt-4">
            <button
              type="submit"
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2"
            >
              Fazer upgrade agora
            </button>
          </form>
          <p className="mt-2 text-xs text-paper-dim">
            Vale na hora. Você paga só a diferença proporcional aos dias que faltam deste mês, no
            mesmo cartão — e a partir da próxima fatura, o valor do Agência.
          </p>
        </div>
      )}

      {pix?.qr_code && (
        <CodigoPix
          qrCode={pix.qr_code}
          qrCodeBase64={pix.qr_code_base64}
          expiraEm={pix.expira_em}
        />
      )}

      {pagamentos.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-bold">Pagamentos</h2>
          <div className="flex flex-col gap-1.5">
            {pagamentos.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/10 px-3 py-2 text-xs"
              >
                <span className="font-bold text-paper">{p.descricao}</span>
                <span className="text-paper-dim">
                  {p.provedor === "stripe" ? "cartão" : "Pix"}
                </span>
                <span className="ml-auto font-bold text-paper">
                  R$ {(p.valor_centavos / 100).toFixed(2).replace(".", ",")}
                </span>
                <span className="text-paper-dim/60">
                  {new Date(p.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
