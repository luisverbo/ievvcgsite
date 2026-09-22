import Link from "next/link";
import { notFound } from "next/navigation";
import { ehAdmin } from "../../actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { cardClass } from "@/components/painel/ui";
import { PLANOS } from "@/lib/painel/permissoes";
import { situacaoDaAssinatura, type AssinaturaRow } from "@/lib/pagamentos/estado";

/*
 * A ficha de uso de um cliente.
 *
 * Nasceu de uma pergunta concreta de reembolso: "ele usou? criou o quê?
 * levou o site embora?". Antes disso a resposta era o palpite de quem
 * lembrava — e discutir devolução com palpite é como se perde dinheiro e
 * razão ao mesmo tempo.
 *
 * O que ela mostra é PROVA, não opinião: as páginas que ele criou, quantas
 * vezes conversou com a IA para ajustá-las, quanto crédito queimou (que é
 * custo nosso, já gasto), se publicou, se BAIXOU o zip, e o que fez na
 * prospecção. Tudo com data.
 *
 * Só leitura. Mexer em plano e acesso continua na lista de contas.
 */

export const dynamic = "force-dynamic";

const emDolar = (micro: number) => `US$${(micro / 1_000_000).toFixed(2).replace(".", ",")}`;
const dia = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

type SiteRow = {
  id: string;
  titulo: string;
  slug: string;
  publicado: boolean;
  created_at: string;
  updated_at: string;
  html: string | null;
};

export default async function FichaDoCliente({ params }: { params: Promise<{ orgId: string }> }) {
  if (!(await ehAdmin())) notFound();
  const { orgId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(orgId)) notFound();

  const admin = createAdminClient();

  const { data: orgRaw } = await admin
    .from("organizacoes")
    .select("id, nome, plano, creditos, cota_mensal, created_at")
    .eq("id", orgId)
    .maybeSingle();
  const org = orgRaw as {
    id: string;
    nome: string;
    plano: string;
    creditos: number;
    cota_mensal: number;
    created_at: string;
  } | null;
  if (!org) notFound();

  const [
    { data: sitesRaw },
    { data: msgsRaw },
    { data: versoesRaw },
    { data: gastosRaw },
    { data: assinaturaRaw },
    { data: pagamentosRaw },
    { count: prospectos },
    { count: enviadas },
    { count: respostas },
    { data: membrosRaw },
  ] = await Promise.all([
    admin
      .from("sites_ia")
      .select("id, titulo, slug, publicado, created_at, updated_at, html")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
    admin.from("sites_ia_mensagens").select("site_ia_id, papel").eq("org_id", orgId),
    admin.from("sites_ia_versoes").select("site_ia_id").eq("org_id", orgId),
    admin
      .from("creditos_lancamentos")
      .select("valor, tipo, created_at")
      .eq("org_id", orgId)
      .eq("tipo", "uso"),
    admin.from("assinaturas").select("plano, pago_ate, status, falhou_em").eq("org_id", orgId).maybeSingle(),
    admin
      .from("pagamentos")
      .select("valor_centavos, provedor, created_at")
      .eq("org_id", orgId)
      .eq("status", "pago")
      .order("created_at", { ascending: false })
      .limit(12),
    admin.from("prospeccao").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    admin
      .from("prospeccao_mensagens")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "enviada"),
    admin
      .from("prospeccao_mensagens")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .not("resposta_em", "is", null),
    admin.from("membros").select("user_id").eq("org_id", orgId),
  ]);

  const sites = (sitesRaw as SiteRow[] | null) ?? [];

  /*
   * Downloads: consulta à parte e tolerante. A tabela é da migração
   * 2026-09-18, e sem ela a ficha inteira não pode deixar de abrir — ela
   * serve justamente para os casos urgentes.
   */
  const downloadsPorSite = new Map<string, { total: number; ultimo: string }>();
  let downloadsTotal = 0;
  let temTabelaDownloads = true;
  try {
    const { data, error } = await admin
      .from("sites_ia_downloads")
      .select("site_ia_id, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (error) temTabelaDownloads = false;
    for (const d of (data as { site_ia_id: string; created_at: string }[] | null) ?? []) {
      downloadsTotal++;
      const atual = downloadsPorSite.get(d.site_ia_id);
      if (atual) atual.total++;
      else downloadsPorSite.set(d.site_ia_id, { total: 1, ultimo: d.created_at });
    }
  } catch {
    temTabelaDownloads = false;
  }

  // Quantas vezes o cliente PEDIU alguma coisa à IA, por página: é a medida
  // mais honesta de uso — página criada e abandonada tem 1, página trabalhada
  // tem dezenas.
  const pedidosPorSite = new Map<string, number>();
  let pedidosTotal = 0;
  for (const m of (msgsRaw as { site_ia_id: string; papel: string }[] | null) ?? []) {
    if (m.papel !== "user") continue;
    pedidosTotal++;
    pedidosPorSite.set(m.site_ia_id, (pedidosPorSite.get(m.site_ia_id) ?? 0) + 1);
  }
  const versoesPorSite = new Map<string, number>();
  for (const v of (versoesRaw as { site_ia_id: string }[] | null) ?? []) {
    versoesPorSite.set(v.site_ia_id, (versoesPorSite.get(v.site_ia_id) ?? 0) + 1);
  }

  const gastos = (gastosRaw as { valor: number; created_at: string }[] | null) ?? [];
  const gastoTotal = gastos.reduce((s, g) => s + Math.abs(g.valor), 0);
  const ultimoGasto = gastos.reduce<string | null>(
    (a, g) => (!a || g.created_at > a ? g.created_at : a),
    null,
  );

  const assinatura = assinaturaRaw as AssinaturaRow | null;
  const situacao = situacaoDaAssinatura(assinatura);
  const pagamentos = (pagamentosRaw as { valor_centavos: number; provedor: string; created_at: string }[] | null) ?? [];
  const pagoTotal = pagamentos.reduce((s, p) => s + p.valor_centavos, 0);

  // Quem são os donos da conta (e-mail), para bater com o pedido de reembolso.
  const ids = ((membrosRaw as { user_id: string }[] | null) ?? []).map((m) => m.user_id);
  const emails: string[] = [];
  if (ids.length > 0) {
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of users?.users ?? []) if (ids.includes(u.id) && u.email) emails.push(u.email);
  }

  const publicados = sites.filter((s) => s.publicado).length;
  const comConteudo = sites.filter((s) => (s.html ?? "").length > 200).length;

  /*
   * O veredito em uma frase. O Admin é você às onze da noite decidindo se
   * devolve R$300 — a conta já vem feita.
   */
  const usou = pedidosTotal >= 3 || downloadsTotal > 0 || publicados > 0 || (enviadas ?? 0) > 0;

  const numeros = [
    { rotulo: "Páginas criadas", valor: String(sites.length), extra: `${comConteudo} com conteúdo` },
    { rotulo: "Pedidos à IA", valor: String(pedidosTotal), extra: "mensagens que ele escreveu" },
    { rotulo: "Publicadas", valor: String(publicados), extra: "no ar" },
    {
      rotulo: "Downloads do zip",
      valor: temTabelaDownloads ? String(downloadsTotal) : "—",
      extra: temTabelaDownloads ? "site levado embora" : "rode a migração 2026-09-18",
    },
    { rotulo: "Crédito de IA gasto", valor: emDolar(gastoTotal), extra: "custo já pago por nós" },
    { rotulo: "Empresas prospectadas", valor: String(prospectos ?? 0), extra: `${enviadas ?? 0} mensagens enviadas` },
  ];

  return (
    <div className="painel-wrap flex flex-col gap-6">
      <div>
        <Link href="/app/admin" className="text-sm text-paper-dim hover:text-paper">
          ← Admin
        </Link>
        <h1 className="mt-2 font-display text-3xl font-extrabold">{org.nome}</h1>
        <p className="mt-1 text-sm text-paper-dim">
          {emails.join(", ") || "sem e-mail"} · plano{" "}
          <b className="text-paper">{PLANOS[org.plano]?.rotulo ?? org.plano}</b> · conta criada em{" "}
          {dia(org.created_at)}
        </p>
      </div>

      {/* O veredito, antes de qualquer tabela. */}
      <div
        className={`rounded-xl border px-4 py-3.5 text-sm ${
          usou ? "border-ok/40 bg-ok/10" : "border-warn/40 bg-warn/10"
        }`}
      >
        <p className={`font-display text-base font-extrabold ${usou ? "text-ok" : "text-warn"}`}>
          {usou ? "Esta conta usou o produto" : "Quase não houve uso"}
        </p>
        <p className="mt-1 text-paper-dim">
          {usou
            ? `${pedidosTotal} pedido${pedidosTotal === 1 ? "" : "s"} à IA, ${sites.length} página${sites.length === 1 ? "" : "s"} criada${sites.length === 1 ? "" : "s"}, ${publicados} publicada${publicados === 1 ? "" : "s"}${temTabelaDownloads && downloadsTotal > 0 ? `, ${downloadsTotal} download${downloadsTotal === 1 ? "" : "s"} do zip` : ""}${(enviadas ?? 0) > 0 ? `, ${enviadas} mensagens de prospecção enviadas` : ""}. Gastou ${emDolar(gastoTotal)} de crédito de IA — custo que já saiu do nosso bolso.`
            : "Poucos pedidos à IA, nada publicado e nenhum download registrado. Se ele pedir reembolso, os números não contradizem a alegação dele."}
        </p>
        <p className="mt-1 text-xs text-paper-dim">
          Última atividade de IA: {dia(ultimoGasto)} · pagamentos recebidos:{" "}
          <b className="text-paper">R${(pagoTotal / 100).toFixed(2).replace(".", ",")}</b> · assinatura{" "}
          {situacao.status}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {numeros.map((n) => (
          <div key={n.rotulo} className={`${cardClass} p-4`}>
            <div className="text-2xl font-extrabold text-paper">{n.valor}</div>
            <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-paper-dim">
              {n.rotulo}
            </div>
            <div className="mt-1 text-[11px] text-paper-dim">{n.extra}</div>
          </div>
        ))}
      </div>

      {/* ------------------------------ as páginas ------------------------------ */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-paper-dim">
          Páginas criadas ({sites.length})
        </h2>
        <div className={`${cardClass} p-0`}>
          {sites.length === 0 ? (
            <p className="px-5 py-6 text-sm text-paper-dim">
              Este cliente nunca criou uma página.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-paper-dim">
                    <th className="px-5 py-3">Página</th>
                    <th className="px-5 py-3">Criada</th>
                    <th className="px-5 py-3">Último ajuste</th>
                    <th className="px-5 py-3 text-right">Pedidos à IA</th>
                    <th className="px-5 py-3 text-right">Versões</th>
                    <th className="px-5 py-3 text-right">Baixou</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sites.map((s) => {
                    const baixou = downloadsPorSite.get(s.id);
                    return (
                      <tr key={s.id} className="transition hover:bg-white/[0.03]">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold">{s.titulo}</div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-paper-dim">
                            <span>/{s.slug}</span>
                            {s.publicado ? (
                              <span className="rounded-full bg-ok/15 px-2 py-0.5 font-bold text-ok">no ar</span>
                            ) : (
                              <span className="rounded-full bg-white/10 px-2 py-0.5">rascunho</span>
                            )}
                            {(s.html ?? "").length <= 200 && (
                              <span className="rounded-full bg-warn/15 px-2 py-0.5 font-bold text-warn">vazia</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-paper-dim">{dia(s.created_at)}</td>
                        <td className="px-5 py-3.5 text-paper-dim">{dia(s.updated_at)}</td>
                        <td className="px-5 py-3.5 text-right tabular-nums">
                          {pedidosPorSite.get(s.id) ?? 0}
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-paper-dim">
                          {versoesPorSite.get(s.id) ?? 0}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {!temTabelaDownloads ? (
                            <span className="text-xs text-paper-dim">—</span>
                          ) : baixou ? (
                            <span className="text-xs font-bold text-ok">
                              {baixou.total}× · {dia(baixou.ultimo)}
                            </span>
                          ) : (
                            <span className="text-xs text-paper-dim">não</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------ prospecção ------------------------------ */}
      {(prospectos ?? 0) > 0 && (
        <div className={cardClass}>
          <h2 className="text-lg font-bold">🎯 Prospecção</h2>
          <p className="mt-1 text-sm text-paper-dim">
            <b className="text-paper">{prospectos}</b> empresas na lista ·{" "}
            <b className="text-paper">{enviadas}</b> mensagens enviadas ·{" "}
            <b className="text-paper">{respostas}</b> respostas recebidas.
          </p>
        </div>
      )}

      {/* ------------------------------ pagamentos ------------------------------ */}
      <div className={cardClass}>
        <h2 className="text-lg font-bold">💳 Pagamentos recebidos</h2>
        {pagamentos.length === 0 ? (
          <p className="mt-1 text-sm text-paper-dim">Nenhum pagamento registrado nesta conta.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-1.5">
            {pagamentos.map((p, i) => (
              <div
                key={`${p.created_at}-${i}`}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm"
              >
                <span className="font-bold text-paper">
                  R${(p.valor_centavos / 100).toFixed(2).replace(".", ",")}
                </span>
                <span className="text-xs text-paper-dim">{p.provedor}</span>
                <span className="ml-auto text-xs text-paper-dim">{dia(p.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-paper-dim">
        Esta ficha é só leitura e existe para decidir com número, não com memória. O crédito de IA
        gasto é dinheiro que já saiu — vale considerar num reembolso. <b className="text-paper">Downloads</b>{" "}
        só contam a partir da migração 2026-09-18: quem baixou antes dela não deixou rastro.
      </p>
    </div>
  );
}
