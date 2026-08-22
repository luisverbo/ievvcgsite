import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMinhaOrg } from "@/lib/painel/queries";
import { assinar, abrirPortal, pixDaMensalidade, subirDePlano } from "./actions";
import CodigoPix from "./CodigoPix";
import { situacaoDaAssinatura, periodoDe, type AssinaturaRow } from "@/lib/pagamentos/estado";
import { PLANOS, sitesDoPlano } from "@/lib/painel/permissoes";
import { precoEmReais, planoVendidoValido, podeSubirPara } from "@/lib/pagamentos/planos";
import { emDolar, PACOTES } from "@/lib/creditos/precos";

export const dynamic = "force-dynamic";

type PagamentoRow = {
  id: string;
  provedor: string;
  tipo: string;
  valor_centavos: number;
  descricao: string;
  created_at: string;
};

const reais = (centavos: number) => `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;

const dia = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }) : "—";

/* Uma linha de "o que este plano te dá". */
function Item({ icone, rotulo, valor }: { icone: string; rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-ink p-4">
      <div className="text-lg">{icone}</div>
      <div className="mt-1.5 font-display text-lg font-extrabold text-paper">{valor}</div>
      <div className="text-xs text-paper-dim">{rotulo}</div>
    </div>
  );
}

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
    .limit(24);
  const pagamentos = (hist as PagamentoRow[] | null) ?? [];

  const podePix = s.status === "atrasada" || s.status === "suspensa";
  /*
   * O plano que a tela mostra é o DA CONTA, não o da linha de assinatura.
   *
   * Os dois divergem sempre que o plano é trocado fora da Stripe — cortesia
   * dada no Admin, migração, suporte. Lendo só a assinatura, uma conta
   * passada para o Prospector continuava anunciando "Plano Agência, R$300,
   * 10 sites, US$15 de crédito": tudo que ela não tem mais. A verdade sobre
   * o que o cliente PODE usar mora em organizacoes.plano, que é a mesma
   * fonte das permissões — então é ela que manda aqui.
   */
  const planoAtual =
    planoVendidoValido(org.plano) ?? planoVendidoValido(assinatura?.plano ?? "") ?? "agencia";
  // Prospector é produto de prospecção: não tem crédito de IA nem hospedagem.
  const ehProspector = planoAtual === "prospector";
  /*
   * Sem oferta de upgrade no Prospector. Quem vende seguro não quer virar
   * criador de sites — empurrar isso aqui só faz ele duvidar do que comprou.
   * A regra de negócio (podeSubirPara) continua permitindo, para o dia em que
   * a oferta fizer sentido; o que não existe é o convite na tela.
   */
  const podeSubir = s.liberado && !ehProspector && podeSubirPara(planoAtual, "agencia");
  const semAssinatura = s.status === "nova" || s.status === "cancelada";

  /*
   * Cor e rótulo do estado, num lugar só.
   *
   * As classes vêm escritas por extenso, e não montadas com `bg-${cor}`: o
   * Tailwind varre o código procurando nomes de classe literais, e o que é
   * montado em tempo de execução simplesmente não existe no CSS final —
   * o elemento sairia sem cor nenhuma.
   */
  const visual = {
    ativa: { selo: "bg-ok/15 text-ok", aviso: "border-ok/40 bg-ok/10 text-ok", rotulo: "Ativa", icone: "✓" },
    atrasada: {
      selo: "bg-warn/15 text-warn",
      aviso: "border-warn/40 bg-warn/10 text-warn",
      rotulo: "Pagamento pendente",
      icone: "⚠",
    },
    suspensa: {
      selo: "bg-danger/15 text-danger",
      aviso: "border-danger/40 bg-danger/10 text-danger",
      rotulo: "Suspensa",
      icone: "⏸",
    },
    cancelada: {
      selo: "bg-white/10 text-paper-dim",
      aviso: "border-white/15 bg-white/5 text-paper-dim",
      rotulo: "Cancelada",
      icone: "○",
    },
    nova: {
      selo: "bg-white/10 text-paper-dim",
      aviso: "border-white/15 bg-white/5 text-paper-dim",
      rotulo: "Sem assinatura",
      icone: "○",
    },
  }[s.status];

  return (
    <div className="painel-wrap flex max-w-4xl flex-col gap-6">
      <div>
        <Link href="/app" className="text-sm text-paper-dim hover:text-paper">
          ← Painel
        </Link>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Assinatura</h1>
        <p className="mt-1 text-sm text-paper-dim">
          Seu plano, suas faturas e a forma de pagamento — tudo num lugar só.
        </p>
      </div>

      {erro && (
        <p
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {erro}
        </p>
      )}
      {aviso && aviso !== "1" && (
        <p
          role="status"
          className="rounded-xl border border-ok/40 bg-ok/10 px-4 py-3 text-sm text-ok"
        >
          {aviso}
        </p>
      )}

      {semAssinatura && org.plano === "prospector" ? (
        /*
         * Prospector liberado na mão (cortesia, sem linha de assinatura):
         * mostrar a vitrine de Pro/Agência aqui seria vender criador de site
         * para quem comprou prospecção — o plano dele está ativo e ponto.
         */
        <div className="rounded-2xl border border-ok/30 bg-ok/5 p-7">
          <span className="rounded-full bg-ok/15 px-3 py-1 text-xs font-bold text-ok">✓ Ativo</span>
          <p className="mt-3 font-display text-2xl font-extrabold">Plano Prospector</p>
          <p className="mt-2 max-w-xl text-sm text-paper-dim">
            Seu acesso está liberado — prospecção completa, sem cobrança por lead e sem consumo de
            créditos. Qualquer dúvida sobre cobrança, fale com o suporte pelo WhatsApp.
          </p>
        </div>
      ) : semAssinatura ? (
        /* ---------------- sem assinatura: a escolha dos planos --------------- */
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-white/15 bg-ink-2 p-7">
            <p className="text-sm font-bold uppercase tracking-wide text-paper-dim">Pro</p>
            <p className="mt-3 font-display text-4xl font-extrabold">
              R$ {precoEmReais("pro")}
              <span className="text-base font-bold text-paper-dim">/mês</span>
            </p>
            <p className="mt-2 text-sm text-paper-dim">
              A fábrica de sites: crie sem limite e hospede seus clientes.
            </p>
            <ul className="mt-5 flex flex-col gap-2 text-sm text-paper-dim">
              <li>✓ Páginas com IA ilimitadas, editadas no chat</li>
              <li>✓ {emDolar(PLANOS.pro.cota)} de crédito de IA por mês</li>
              <li>✓ {sitesDoPlano("pro")} sites em domínio próprio</li>
              <li>✓ Métricas, pixel e download em .zip</li>
              <li className="opacity-50">✗ Prospecção e WhatsApp</li>
            </ul>
            <form action={assinar.bind(null, "pro")} className="mt-6">
              <button
                type="submit"
                className="w-full rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-paper transition hover:border-brand-2 hover:text-brand-2"
              >
                Assinar o Pro
              </button>
            </form>
          </div>

          <div className="relative rounded-2xl border border-brand-2/50 bg-gradient-to-br from-brand/20 to-transparent p-7">
            <span className="absolute -top-3 left-7 rounded-full bg-brand px-3 py-1 text-[11px] font-bold text-white">
              MAIS COMPLETO
            </span>
            <p className="text-sm font-bold uppercase tracking-wide text-brand-2">Agência</p>
            <p className="mt-3 font-display text-4xl font-extrabold">
              R$ {precoEmReais("agencia")}
              <span className="text-base font-bold text-paper-dim">/mês</span>
            </p>
            <p className="mt-2 text-sm text-paper-dim">
              A fábrica + o vendedor: o sistema acha e aborda os clientes.
            </p>
            <ul className="mt-5 flex flex-col gap-2 text-sm text-paper-dim">
              <li className="font-semibold text-paper">✓ Tudo do Pro, e mais:</li>
              <li>✓ Prospecção no Google Maps com nota</li>
              <li>✓ Abordagem no WhatsApp</li>
              <li>✓ {sitesDoPlano("agencia")} sites em domínio próprio</li>
              <li>✓ {emDolar(PLANOS.agencia.cota)} de crédito de IA por mês</li>
            </ul>
            <form action={assinar.bind(null, "agencia")} className="mt-6">
              <button
                type="submit"
                className="w-full rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-2"
              >
                Assinar o Agência
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* ---------------- com assinatura: o cartão do plano ------------------ */
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-2">
          <div className="border-b border-white/10 bg-gradient-to-br from-brand/15 to-transparent p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${visual.selo}`}>
                    {visual.icone} {visual.rotulo}
                  </span>
                </div>
                <h2 className="mt-3 font-display text-3xl font-extrabold text-paper">
                  Plano {PLANOS[planoAtual]?.rotulo}
                </h2>
                <p className="mt-1 text-sm text-paper-dim">
                  R$ {precoEmReais(planoAtual)} por mês ·{" "}
                  {s.status === "ativa"
                    ? `renova sozinho em ${dia(assinatura?.pago_ate)}`
                    : "renovação pendente"}
                </p>
              </div>
              <form action={abrirPortal}>
                <button
                  type="submit"
                  className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-paper transition hover:border-brand-2"
                >
                  Cartão e faturas →
                </button>
              </form>
            </div>

            {s.aviso && (
              <p className={`mt-4 rounded-xl border px-4 py-3 text-sm ${visual.aviso}`}>{s.aviso}</p>
            )}
            {s.status === "atrasada" && (
              <p className="mt-2 text-sm text-paper-dim">
                Até lá <b className="text-paper">nada sai do ar</b> — seus sites e os dos seus
                clientes continuam funcionando normalmente.
              </p>
            )}
          </div>

          {/* o que este plano entrega, em números */}
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            {ehProspector ? (
              <>
                <Item icone="🔎" valor="Ilimitadas" rotulo="buscas no Google Maps" />
                <Item icone="💬" valor="Incluído" rotulo="envio e remarketing no WhatsApp" />
                <Item icone="🏷️" valor="R$ 0" rotulo="por lead — sem cobrança extra" />
              </>
            ) : (
              <>
                <Item
                  icone="⚡"
                  valor={emDolar(PLANOS[planoAtual]?.cota ?? 0)}
                  rotulo="crédito de IA por mês"
                />
                <Item
                  icone="🌐"
                  valor={String(sitesDoPlano(planoAtual))}
                  rotulo="sites em domínio próprio"
                />
                <Item
                  icone="🎯"
                  valor={planoAtual === "agencia" ? "Incluída" : "—"}
                  rotulo="prospecção e WhatsApp"
                />
              </>
            )}
          </div>

          {(podePix || s.status === "suspensa") && (
            <div className="border-t border-white/10 p-5">
              <div className="flex flex-wrap gap-2">
                {s.status === "suspensa" && (
                  <form action={assinar.bind(null, planoAtual)}>
                    <button
                      type="submit"
                      className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2"
                    >
                      Reativar no cartão
                    </button>
                  </form>
                )}
                {podePix && !pix && (
                  <form action={pixDaMensalidade}>
                    <button
                      type="submit"
                      className="rounded-xl border border-ok/40 px-5 py-2.5 text-sm font-bold text-ok transition hover:bg-ok/10"
                    >
                      Pagar este mês no Pix
                    </button>
                  </form>
                )}
              </div>
              {podePix && (
                <p className="mt-3 text-xs text-paper-dim">
                  A assinatura é sempre no cartão, porque é ela que renova sozinha. O Pix aparece só
                  quando o cartão recusa, para você não ficar refém do banco — e assim que ele for
                  confirmado, a cobrança do cartão deste mês é cancelada, sem risco de pagar duas
                  vezes.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {pix?.qr_code && (
        <CodigoPix qrCode={pix.qr_code} qrCodeBase64={pix.qr_code_base64} expiraEm={pix.expira_em} />
      )}

      {/* upgrade — oferta, separada da manutenção da conta */}
      {podeSubir && (
        <div className="rounded-2xl border border-brand-2/40 bg-gradient-to-br from-brand/15 to-transparent p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-xl font-extrabold text-paper">
                Subir para o Agência
              </h2>
              <p className="mt-1.5 max-w-xl text-sm text-paper-dim">
                O sistema passa a <b className="text-paper">encontrar clientes para você</b>:
                prospecção no Google Maps com nota de potencial, abordagem automática no WhatsApp e
                fotos do Instagram das empresas. Sua cota vai de {sitesDoPlano("pro")} para{" "}
                {sitesDoPlano("agencia")} sites e o crédito de {emDolar(PLANOS.pro.cota)} para{" "}
                {emDolar(PLANOS.agencia.cota)} por mês.
              </p>
              <p className="mt-2 text-xs text-paper-dim">
                Você paga só a diferença proporcional aos dias que faltam deste mês. A partir da
                próxima fatura, R$ {precoEmReais("agencia")}.
              </p>
            </div>
            <form action={subirDePlano.bind(null, "agencia")} className="flex-none">
              <button
                type="submit"
                className="rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-2"
              >
                Fazer upgrade →
              </button>
            </form>
          </div>
        </div>
      )}

      {/* histórico */}
      {pagamentos.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-ink-2 p-5">
          <h2 className="text-sm font-bold text-paper">Histórico de pagamentos</h2>
          <div className="mt-3 flex flex-col divide-y divide-white/5">
            {pagamentos.map((p) => {
              const eh = {
                assinatura: { icone: "📄", cor: "text-paper" },
                upgrade: { icone: "⬆️", cor: "text-brand-2" },
                credito: { icone: "⚡", cor: "text-ok" },
              }[p.tipo] ?? { icone: "•", cor: "text-paper" };
              return (
                <div key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                  <span className="text-base">{eh.icone}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-paper">
                      {p.descricao}
                    </span>
                    <span className="block text-xs text-paper-dim">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")} ·{" "}
                      {p.provedor === "stripe" ? "cartão" : "Pix"}
                    </span>
                  </span>
                  <span className={`text-sm font-bold tabular-nums ${eh.cor}`}>
                    {reais(p.valor_centavos)}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-paper-dim">
            As notas fiscais e os recibos ficam em{" "}
            <b className="text-paper">Cartão e faturas</b>, no portal da Stripe.
          </p>
        </div>
      )}

      {/* dúvidas que aparecem justo aqui */}
      <div className="flex flex-col gap-2">
        {[
          {
            q: "Como faço para cancelar?",
            r: ehProspector
              ? "Clique em “Cartão e faturas” e escolha cancelar. São dois cliques, sem falar com ninguém. O que você já pagou vale até o fim do mês, e sua lista de empresas continua salva."
              : "Clique em “Cartão e faturas” e escolha cancelar. São dois cliques, sem falar com ninguém. O que você já pagou vale até o fim do mês, e suas páginas e domínios continuam salvos.",
          },
          {
            q: "E se o cartão falhar?",
            r: ehProspector
              ? "Você tem 7 dias para regularizar, com aviso na tela, e nesse período aparece aqui a opção de pagar aquele mês no Pix. Sua lista e seu histórico de conversas ficam intactos."
              : "Nada sai do ar na hora: você tem 7 dias para regularizar, com aviso na tela, e nesse período aparece aqui a opção de pagar aquele mês no Pix. Seus sites e os dos seus clientes continuam funcionando.",
          },
          // As duas últimas só valem para quem tem construtor e hospedagem —
          // no Prospector não existe crédito de IA nem site hospedado.
          ...(ehProspector
            ? [
                {
                  q: "Quantas empresas posso buscar e abordar?",
                  r: "Não há limite de buscas nem cobrança por lead. O único limite que recomendamos é o do próprio WhatsApp: comece com 15 a 20 mensagens por dia e aumente devagar — é isso que mantém o seu número seguro.",
                },
                {
                  q: "Preciso comprar créditos para usar?",
                  r: "Não. A mensalidade cobre tudo: a busca no Google Maps, o envio no WhatsApp e o remarketing. Não existe crédito para comprar nem consumo escondido.",
                },
              ]
            : [
                {
                  q: "O crédito de IA acabou antes do fim do mês.",
                  r: `A cota se repõe sozinha todo mês. Se precisar de mais antes disso, compre crédito avulso na tela de Créditos — a partir de R$ ${PACOTES[0].preco} — ou cole a sua própria chave da Anthropic e pague o preço de custo direto a eles.`,
                },
                {
                  q: "Preciso de mais sites hospedados.",
                  r: "Cada site além da cota do plano custa R$ 29,90 por mês, cobrado nesta mesma assinatura. Você autoriza antes de conectar o domínio, e a cobrança sai sozinha se você desconectar.",
                },
              ]),
        ].map((d) => (
          <details
            key={d.q}
            className="group rounded-xl border border-white/10 bg-ink-2 px-5 py-4 transition open:border-brand-2/40"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-paper marker:hidden">
              {d.q}
              <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full border border-white/15 text-xs text-paper-dim transition group-open:rotate-45 group-open:border-brand-2 group-open:text-brand-2">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-paper-dim">{d.r}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
