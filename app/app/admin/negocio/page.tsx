import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ehAdmin } from "@/lib/painel/admin";
import { situacaoDaAssinatura, type AssinaturaRow } from "@/lib/pagamentos/estado";
import { precoCentavos, planoVendidoValido } from "@/lib/pagamentos/planos";
import { PRECO_SITE_EXTRA_CENTAVOS } from "@/lib/dominios/cota";
import { cardClass } from "@/components/painel/ui";

export const dynamic = "force-dynamic";

/*
 * O painel do NEGÓCIO — o caixa, não o produto.
 *
 * Responde as quatro perguntas que o dono faz de manhã: quanto entra por mês
 * (MRR), quanto já entrou, quem está devendo, e para onde a curva aponta.
 * E fecha com a lista de AÇÕES — porque número sem próximo passo é enfeite.
 *
 * Gráficos em SVG puro, desenhados no servidor: zero biblioteca, zero JS no
 * navegador. Paleta validada contra o fundo escuro (barras #8e7bff, linha
 * #29a97e — passou nas seis checagens de daltonismo/contraste do validador).
 */

const TZ = "America/Sao_Paulo";
const reais = (centavos: number) =>
  `R$ ${(centavos / 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

function chaveMes(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit" }).format(d);
}
function rotuloMes(chave: string): string {
  const [ano, mes] = chave.split("-").map(Number);
  return ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][mes - 1] + (mes === 1 ? `/${String(ano).slice(2)}` : "");
}
// Os últimos N meses, do mais antigo ao atual.
function ultimosMeses(n: number): string[] {
  const saida: string[] = [];
  const agora = new Date();
  for (let i = n - 1; i >= 0; i--) {
    saida.push(chaveMes(new Date(agora.getFullYear(), agora.getMonth() - i, 15)));
  }
  return saida;
}
function mesFuturo(i: number): string {
  const agora = new Date();
  return chaveMes(new Date(agora.getFullYear(), agora.getMonth() + i, 15));
}

/* ------------------------- gráfico de barras (SVG) ------------------------ */

function GraficoReceita({
  meses,
  projecao,
}: {
  meses: { chave: string; valor: number }[];
  projecao: { chave: string; valor: number }[];
}) {
  const todos = [...meses, ...projecao];
  const max = Math.max(1, ...todos.map((m) => m.valor));
  const W = 720;
  const H = 210;
  const pad = { top: 24, right: 8, bottom: 26, left: 46 };
  const areaW = W - pad.left - pad.right;
  const areaH = H - pad.top - pad.bottom;
  const slot = areaW / todos.length;
  const larguraBarra = Math.min(34, slot - 6);

  const y = (v: number) => pad.top + areaH * (1 - v / max);
  const linhas = [0.5, 1].map((f) => Math.round((max * f) / 100) * 100);
  const iMax = todos.reduce((a, m, i) => (m.valor > todos[a].valor ? i : a), 0);
  const mesAtual = meses.length - 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Receita por mês">
      {/* grade recessiva */}
      {linhas.map((v) => (
        <g key={v}>
          <line x1={pad.left} x2={W - pad.right} y1={y(v)} y2={y(v)} stroke="rgba(244,246,251,0.07)" />
          <text x={pad.left - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#a6adbd">
            {reais(v)}
          </text>
        </g>
      ))}
      <line x1={pad.left} x2={W - pad.right} y1={pad.top + areaH} y2={pad.top + areaH} stroke="rgba(244,246,251,0.15)" />

      {todos.map((m, i) => {
        const ehProjecao = i >= meses.length;
        const x = pad.left + i * slot + (slot - larguraBarra) / 2;
        const alturaMin = m.valor > 0 ? 3 : 0;
        const h = Math.max(alturaMin, areaH * (m.valor / max));
        const topo = pad.top + areaH - h;
        return (
          <g key={m.chave}>
            {ehProjecao ? (
              /* projeção: contorno tracejado — visivelmente NÃO é dinheiro no bolso */
              <rect
                x={x} y={topo} width={larguraBarra} height={h} rx={4}
                fill="rgba(142,123,255,0.12)" stroke="#8e7bff" strokeWidth="1.5" strokeDasharray="4 3"
              />
            ) : (
              <rect x={x} y={topo} width={larguraBarra} height={h} rx={4} fill="#8e7bff" />
            )}
            {/* rótulo direto só onde importa: o maior, o mês atual e as projeções */}
            {(i === iMax || i === mesAtual || ehProjecao) && m.valor > 0 && (
              <text x={x + larguraBarra / 2} y={topo - 5} textAnchor="middle" fontSize="9" fontWeight="700" fill={ehProjecao ? "#a6adbd" : "#f4f6fb"}>
                {reais(m.valor)}
              </text>
            )}
            <text x={x + larguraBarra / 2} y={H - 8} textAnchor="middle" fontSize="9" fill={ehProjecao ? "#6b7280" : "#a6adbd"}>
              {rotuloMes(m.chave)}
            </text>
            {/* tooltip nativo do navegador */}
            <title>
              {rotuloMes(m.chave)}: {reais(m.valor)}{ehProjecao ? " (projeção)" : ""}
            </title>
          </g>
        );
      })}
    </svg>
  );
}

/* -------------------------- gráfico de linha (SVG) ------------------------ */

function GraficoClientes({ meses }: { meses: { chave: string; valor: number }[] }) {
  const max = Math.max(1, ...meses.map((m) => m.valor));
  const W = 720;
  const H = 150;
  const pad = { top: 18, right: 40, bottom: 24, left: 30 };
  const areaW = W - pad.left - pad.right;
  const areaH = H - pad.top - pad.bottom;
  const x = (i: number) => pad.left + (meses.length === 1 ? areaW / 2 : (areaW * i) / (meses.length - 1));
  const y = (v: number) => pad.top + areaH * (1 - v / max);
  const pontos = meses.map((m, i) => `${x(i)},${y(m.valor)}`).join(" ");
  const ultimo = meses[meses.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Clientes pagantes por mês">
      <line x1={pad.left} x2={W - pad.right} y1={pad.top + areaH} y2={pad.top + areaH} stroke="rgba(244,246,251,0.15)" />
      {/* área sob a linha, bem sutil */}
      <polygon
        points={`${pad.left},${pad.top + areaH} ${pontos} ${x(meses.length - 1)},${pad.top + areaH}`}
        fill="rgba(41,169,126,0.10)"
      />
      <polyline points={pontos} fill="none" stroke="#29a97e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {meses.map((m, i) => (
        <g key={m.chave}>
          {/* alvo de hover maior que o ponto */}
          <circle cx={x(i)} cy={y(m.valor)} r="10" fill="transparent">
            <title>{rotuloMes(m.chave)}: {m.valor} pagantes</title>
          </circle>
          {(i === 0 || i === meses.length - 1) && (
            <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#a6adbd">
              {rotuloMes(m.chave)}
            </text>
          )}
        </g>
      ))}
      {/* o último ponto é o que importa: marcador + rótulo direto */}
      <circle cx={x(meses.length - 1)} cy={y(ultimo.valor)} r="4.5" fill="#29a97e" stroke="#161a23" strokeWidth="2" />
      <text x={x(meses.length - 1) + 8} y={y(ultimo.valor) + 3} fontSize="11" fontWeight="700" fill="#f4f6fb">
        {ultimo.valor}
      </text>
    </svg>
  );
}

/* --------------------------------- página --------------------------------- */

type LinhaAssinatura = AssinaturaRow & {
  org_id: string;
  organizacoes: { nome: string; sites_extras_pagos: number } | null;
};

export default async function NegocioPage() {
  if (!(await ehAdmin())) notFound();
  const admin = createAdminClient();

  const [{ data: assRaw }, { data: pagRaw }, { data: orgsRaw }] = await Promise.all([
    admin
      .from("assinaturas")
      .select("org_id, plano, pago_ate, status, falhou_em, organizacoes(nome, sites_extras_pagos)"),
    admin
      .from("pagamentos")
      .select("org_id, tipo, valor_centavos, status, created_at")
      .eq("status", "pago")
      .order("created_at", { ascending: true }),
    admin.from("organizacoes").select("id, nome, plano, created_at"),
  ]);

  const assinaturas = (assRaw as LinhaAssinatura[] | null) ?? [];
  const pagamentos =
    (pagRaw as { org_id: string; tipo: string; valor_centavos: number; created_at: string }[] | null) ?? [];
  const orgs = (orgsRaw as { id: string; nome: string; plano: string; created_at: string }[] | null) ?? [];

  /* ------------------------------- o caixa ------------------------------- */

  let mrr = 0;
  const atrasadas: { nome: string; dias: number; valor: number }[] = [];
  const suspensas: { nome: string; valor: number }[] = [];
  let pagantes = 0;

  for (const a of assinaturas) {
    const s = situacaoDaAssinatura(a);
    const mensal =
      precoCentavos(planoVendidoValido(a.plano) ?? "agencia") +
      (a.organizacoes?.sites_extras_pagos ?? 0) * PRECO_SITE_EXTRA_CENTAVOS;
    const nome = a.organizacoes?.nome ?? "—";
    if (s.status === "ativa" || s.status === "atrasada") {
      mrr += mensal;
      pagantes++;
    }
    if (s.status === "atrasada") {
      atrasadas.push({ nome, dias: 7 - s.diasRestantes, valor: mensal });
    }
    if (s.status === "suspensa") suspensas.push({ nome, valor: mensal });
  }

  const aReceber = atrasadas.reduce((s, a) => s + a.valor, 0) + suspensas.reduce((s, a) => s + a.valor, 0);

  const chavesMeses = ultimosMeses(12);
  const receitaPorMes = new Map(chavesMeses.map((c) => [c, 0]));
  let recebidoTotal = 0;
  for (const p of pagamentos) {
    recebidoTotal += p.valor_centavos;
    const c = chaveMes(new Date(p.created_at));
    if (receitaPorMes.has(c)) receitaPorMes.set(c, (receitaPorMes.get(c) ?? 0) + p.valor_centavos);
  }
  const mesAtualChave = chavesMeses[chavesMeses.length - 1];
  const recebidoMes = receitaPorMes.get(mesAtualChave) ?? 0;
  const meses = chavesMeses.map((chave) => ({ chave, valor: receitaPorMes.get(chave) ?? 0 }));

  /*
   * Projeção honesta e simples: o próximo mês parte do MRR (o contratado hoje)
   * e cresce pela média de entrada dos últimos 3 meses com receita. Não é
   * previsão de banco — é a régua "mantendo o ritmo, dá isto".
   */
  const comReceita = meses.filter((m) => m.valor > 0);
  const ultimos3 = comReceita.slice(-3);
  const crescimentoMedio =
    ultimos3.length >= 2
      ? Math.max(0, (ultimos3[ultimos3.length - 1].valor - ultimos3[0].valor) / (ultimos3.length - 1))
      : 0;
  const projecao = [1, 2, 3].map((i) => ({
    chave: mesFuturo(i),
    valor: Math.round(mrr + crescimentoMedio * i),
  }));

  /* --------------------------- clientes por mês --------------------------- */

  const primeiroPagamento = new Map<string, string>();
  for (const p of pagamentos) {
    if (p.tipo !== "assinatura" && p.tipo !== "upgrade") continue;
    if (!primeiroPagamento.has(p.org_id)) primeiroPagamento.set(p.org_id, chaveMes(new Date(p.created_at)));
  }
  const clientesMeses = chavesMeses.map((chave) => ({
    chave,
    valor: [...primeiroPagamento.values()].filter((c) => c <= chave).length,
  }));

  const gratis = orgs.filter((o) => o.plano === "free").length;

  /* ------------------------------ ações a tomar --------------------------- */

  const acoes: { icone: string; classe: string; texto: string; href?: string }[] = [];
  for (const a of atrasadas) {
    acoes.push({
      icone: "⚠️",
      classe: "border-warn/40 bg-warn/10 text-warn",
      texto: `${a.nome} está com o pagamento atrasado há ${Math.max(1, a.dias)} dia${a.dias > 1 ? "s" : ""} (${reais(a.valor)}/mês). Um toque no WhatsApp resolve a maioria.`,
    });
  }
  for (const s of suspensas) {
    acoes.push({
      icone: "⛔",
      classe: "border-danger/40 bg-danger/10 text-danger",
      texto: `${s.nome} está suspensa — ${reais(s.valor)}/mês parados. Vale uma ligação de resgate: o site do cliente dela está fora do ar.`,
    });
  }
  if (gratis > 0) {
    acoes.push({
      icone: "🌱",
      classe: "border-brand-2/40 bg-brand/10 text-brand-2",
      texto: `${gratis} conta${gratis > 1 ? "s" : ""} no plano grátis — cada uma é um assinante em potencial. Um e-mail com caso de sucesso costuma converter.`,
    });
  }
  if (acoes.length === 0) {
    acoes.push({
      icone: "✅",
      classe: "border-ok/40 bg-ok/10 text-ok",
      texto: "Nenhuma pendência: ninguém atrasado, ninguém suspenso. Bora vender.",
    });
  }

  const tiles = [
    { rotulo: "Receita mensal (MRR)", valor: reais(mrr), nota: `${pagantes} assinante${pagantes === 1 ? "" : "s"} em dia` },
    { rotulo: "Recebido este mês", valor: reais(recebidoMes), nota: rotuloMes(mesAtualChave) },
    { rotulo: "Recebido no total", valor: reais(recebidoTotal), nota: "desde o começo" },
    { rotulo: "A receber (parado)", valor: reais(aReceber), nota: `${atrasadas.length + suspensas.length} conta${atrasadas.length + suspensas.length === 1 ? "" : "s"} pendente${atrasadas.length + suspensas.length === 1 ? "" : "s"}` },
  ];

  return (
    <div className="painel-wrap flex flex-col gap-6">
      <div className="anim-entrada">
        <Link href="/app/admin" className="text-sm text-paper-dim hover:text-paper">
          ← Admin
        </Link>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Painel do negócio 📊</h1>
        <p className="mt-1 text-sm text-paper-dim">
          O caixa do PáginaPro: quanto entra, quanto entrou, quem deve e para onde aponta. Só você
          vê esta página.
        </p>
      </div>

      {/* números-herói */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <div
            key={t.rotulo}
            className={`anim-entrada d${i + 1} rounded-xl border border-white/10 bg-ink-2 p-4`}
          >
            <div className="font-display text-2xl font-extrabold tabular-nums text-paper">
              {t.valor}
            </div>
            <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-paper-dim">
              {t.rotulo}
            </div>
            <div className="mt-0.5 text-[11px] text-paper-dim/70">{t.nota}</div>
          </div>
        ))}
      </div>

      {/* receita + projeção */}
      <div className={`anim-entrada d3 ${cardClass}`}>
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold text-paper">Receita por mês</h2>
          <span className="text-[11px] text-paper-dim">
            <span className="mr-3 inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-[#8e7bff]" /> recebido
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px] border border-dashed border-[#8e7bff]" />{" "}
              projeção
            </span>
          </span>
        </div>
        <GraficoReceita meses={meses} projecao={projecao} />
        <p className="mt-1 text-[11px] text-paper-dim">
          Projeção simples: parte do MRR contratado hoje e segue o ritmo médio dos últimos meses.
          Régua, não promessa.
        </p>
      </div>

      {/* clientes pagantes */}
      <div className={`anim-entrada d4 ${cardClass}`}>
        <h2 className="mb-1 text-sm font-bold text-paper">Clientes pagantes (acumulado)</h2>
        <GraficoClientes meses={clientesMeses} />
      </div>

      {/* ações */}
      <div className="anim-entrada d5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-paper-dim">
          Ações a tomar
        </h2>
        <div className="flex flex-col gap-2">
          {acoes.map((a, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${a.classe}`}
            >
              <span className="text-base">{a.icone}</span>
              <span className="text-paper">{a.texto}</span>
            </div>
          ))}
        </div>
      </div>

      {/* leitura em tabela — o mesmo dado dos gráficos, para quem prefere número */}
      <details className="anim-entrada d6 rounded-xl border border-white/10 bg-ink-2 px-5 py-4">
        <summary className="cursor-pointer text-sm font-bold text-paper-dim">
          Ver os números em tabela
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-paper-dim">
                <th className="pr-4 pb-2 font-normal">Mês</th>
                <th className="pr-4 pb-2 font-normal">Receita</th>
                <th className="pb-2 font-normal">Pagantes (acum.)</th>
              </tr>
            </thead>
            <tbody className="text-paper">
              {meses.map((m, i) => (
                <tr key={m.chave} className="border-t border-white/5">
                  <td className="py-1.5 pr-4">{rotuloMes(m.chave)}</td>
                  <td className="py-1.5 pr-4 tabular-nums">{reais(m.valor)}</td>
                  <td className="py-1.5 tabular-nums">{clientesMeses[i].valor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
