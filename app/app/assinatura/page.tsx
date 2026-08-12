import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMinhaOrg } from "@/lib/painel/queries";
import { assinar, abrirPortal, pixDaMensalidade } from "./actions";
import CodigoPix from "./CodigoPix";
import { situacaoDaAssinatura, periodoDe, type AssinaturaRow } from "@/lib/pagamentos/estado";
import { PLANOS } from "@/lib/painel/permissoes";
import { emDolar } from "@/lib/creditos/precos";
import { cardClass } from "@/components/painel/ui";

export const dynamic = "force-dynamic";

const PRECO = (Number(process.env.PRECO_MENSAL_CENTAVOS) || 30_000) / 100;

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

      {/* estado atual */}
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

        {(s.status === "nova" || s.status === "cancelada") && (
          <>
            <p className="font-display text-2xl font-extrabold">
              R$ {PRECO.toLocaleString("pt-BR")}
              <span className="text-base font-bold text-paper-dim">/mês</span>
            </p>
            <p className="mt-1 text-sm text-paper-dim">
              Sites com IA ilimitados, prospecção no Google, abordagem no WhatsApp, hospedagem com
              domínio próprio e {emDolar(PLANOS.agencia.cota)} de crédito de IA todo mês.
            </p>
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
            <form action={assinar}>
              <button
                type="submit"
                className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2"
              >
                Assinar no cartão
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
