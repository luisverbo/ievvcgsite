import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { PLANOS, planoVigente, planoLibera, planoFreeAtivo } from "@/lib/painel/permissoes";
import { ehAdmin } from "@/lib/painel/admin";
import { situacaoDaAssinatura, type AssinaturaRow } from "@/lib/pagamentos/estado";
import { statusDaConta } from "@/lib/creditos/conta";
import { emDolar } from "@/lib/creditos/precos";
import Robo, { type EstadoRobo } from "@/components/painel/Robo";

/*
 * A home do painel — a visão do CLIENTE.
 *
 * Uma pergunta guia a tela inteira: "abri o painel, e agora?". Três andares:
 *
 *   1. o que precisa de atenção AGORA (pagamento atrasado);
 *   2. como está o negócio dele (páginas, visitas, crédito);
 *   3. para onde ir (as áreas, cada uma explicada em uma frase).
 *
 * E uma regra de tom: isto não é um "sistema", é um time de agentes
 * trabalhando para ele. O robô da prospecção tem estado (trabalhando,
 * dormindo, esperando instalação) porque é assim que o cliente entende o que
 * está acontecendo — "seu agente está dormindo" explica mais que qualquer
 * badge cinza.
 */

function desde30Dias() {
  return new Date(Date.now() - 30 * 86_400_000).toISOString();
}

// "Bom dia" às 7h de Brasília, mesmo com o servidor em UTC.
function saudacao(): string {
  const hora = Number(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
  );
  if (hora >= 5 && hora < 12) return "Bom dia";
  if (hora >= 12 && hora < 18) return "Boa tarde";
  return "Boa noite";
}

type PaginaIA = {
  id: string;
  titulo: string;
  slug: string;
  publicado: boolean;
  html: string | null;
  updated_at: string;
};

export default async function PainelHome() {
  const org = await getMinhaOrg();
  if (!org) redirect("/app/onboarding");

  const supabase = await createClient();
  const [plano, admin, conta, assinaturaRes, paginasRes, visitasRes] = await Promise.all([
    planoVigente(org.id, org.plano),
    ehAdmin(),
    statusDaConta(org.id),
    supabase
      .from("assinaturas")
      .select("plano, pago_ate, status, falhou_em")
      .eq("org_id", org.id)
      .maybeSingle(),
    supabase
      .from("sites_ia")
      .select("id, titulo, slug, publicado, html, updated_at")
      .eq("org_id", org.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("analytics_eventos")
      .select("id", { count: "exact", head: true })
      .eq("org_id", org.id)
      .eq("tipo", "pageview")
      .gte("created_at", desde30Dias()),
  ]);

  const situacao = situacaoDaAssinatura((assinaturaRes.data as AssinaturaRow | null) ?? null);

  /*
   * Modo Prospector: a home é OUTRA — a de um produto só de prospecção.
   * Nada de páginas, visitas ou crédito de IA: quem comprou o Prospector
   * não tem (nem quer) nada disso na frente.
   */
  /*
   * O teste grátis também cai na home do Prospector — inclusive vencido:
   * a tela que pede a assinatura tem que ser a do produto que a pessoa
   * testou, com o botão de assinar em cima, não a de um criador de sites.
   */
  if (!admin && (plano === "prospector" || org.plano === "prospector" || org.plano === "teste")) {
    const { situacaoDoTeste } = await import("@/lib/painel/teste");
    return (
      <HomeProspector
        orgId={org.id}
        nome={org.nome}
        avisoAssinatura={situacao.aviso}
        teste={situacaoDoTeste(org as { plano: string; teste_ate?: string | null })}
      />
    );
  }

  const paginas = (paginasRes.data as PaginaIA[] | null) ?? [];
  const noAr = paginas.filter((p) => p.publicado).length;
  const visitas30d = visitasRes.count ?? 0;
  const recentes = paginas.slice(0, 3);

  /*
   * Grátis CONTRATADO x grátis por queda.
   *
   * `plano` (o vigente) também é "free" quando um assinante é suspenso — e aí
   * os banners da degustação apareceriam para ele, brigando com o aviso de
   * suspensão na mesma tela. A degustação só diz respeito a quem NUNCA
   * assinou: org.plano === "free".
   */
  const ehFreeContratado = !admin && org.plano === "free";
  const freeAtivo = !admin && plano === "free" ? await planoFreeAtivo() : true;
  const temConstrutor = admin || (planoLibera(plano, "construtor") && (plano !== "free" || freeAtivo));
  const temProspeccao = admin || planoLibera(plano, "prospeccao");

  // O rótulo do botão principal conta a situação real, não a genérica.
  const acaoPrincipal = temConstrutor
    ? { href: "/app/ia", rotulo: "+ Criar página com IA" }
    : situacao.status === "suspensa" || situacao.status === "atrasada"
      ? { href: "/app/assinatura", rotulo: "Regularizar pagamento" }
      : { href: "/app/assinatura", rotulo: "Assinar para começar" };

  // Prospecção só é consultada para quem tem o recurso — senão é banco à toa.
  let empresas = 0;
  let estadoAgente: EstadoRobo = "novo";
  if (temProspeccao) {
    const [{ count }, { data: ag }] = await Promise.all([
      supabase.from("prospeccao").select("id", { count: "exact", head: true }).eq("org_id", org.id),
      supabase
        .from("agentes")
        .select("ultimo_contato")
        .eq("org_id", org.id)
        .order("ultimo_contato", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    empresas = count ?? 0;
    const linha = ag as { ultimo_contato: string | null } | null;
    if (linha) {
      const online =
        !!linha.ultimo_contato && Date.now() - new Date(linha.ultimo_contato).getTime() < 15 * 60_000;
      estadoAgente = online ? "trabalhando" : "dormindo";
    }
  }

  const stats = [
    { rotulo: "Páginas criadas", valor: String(paginas.length) },
    { rotulo: "No ar", valor: String(noAr) },
    { rotulo: "Visitas (30 dias)", valor: String(visitas30d) },
    {
      rotulo: "Crédito de IA",
      valor: conta.fonte === "propria" ? "chave própria" : emDolar(conta.saldo),
    },
  ];

  return (
    <div className="relative">
      {/* brilho de fundo — profundidade sem pesar nada */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] opacity-50"
        style={{
          background:
            "radial-gradient(60% 80% at 20% 0%, rgba(108,92,231,0.16), transparent 70%), radial-gradient(50% 70% at 85% 10%, rgba(234,92,147,0.08), transparent 70%)",
        }}
      />

      <div className="painel-wrap flex flex-col gap-8">
        {/* quem é, em que plano está */}
        <div className="anim-entrada flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-paper-dim">{saudacao()} 👋</p>
            <h1 className="mt-0.5 font-display text-3xl font-extrabold">{org.nome}</h1>
            <p className="mt-1.5 text-sm text-paper-dim">
              Plano{" "}
              <span className="rounded-full bg-brand/20 px-2 py-0.5 text-xs font-bold text-brand-2">
                {PLANOS[plano]?.rotulo ?? plano}
              </span>
            </p>
          </div>
          <Link
            href={acaoPrincipal.href}
            className="rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand/30 transition hover:-translate-y-0.5 hover:bg-brand-2 hover:shadow-brand/50"
          >
            {acaoPrincipal.rotulo}
          </Link>
        </div>

        {/* degustação — só para quem nunca assinou */}
        {ehFreeContratado && situacao.status !== "suspensa" && situacao.status !== "atrasada" && (
          freeAtivo ? (
            <div className="anim-entrada d1 rounded-xl border border-brand-2/30 bg-brand/10 px-4 py-3 text-sm text-paper">
              Você está no plano grátis: crie <b>1 página</b> com um único pedido e publique de graça
              no endereço PáginaPro.{" "}
              <Link
                href="/app/assinatura"
                className="font-bold text-brand-2 underline underline-offset-2"
              >
                Assinando
              </Link>{" "}
              você libera edição por chat, páginas ilimitadas, prospecção e domínio próprio.
            </div>
          ) : (
            <div className="anim-entrada d1 rounded-xl border border-white/15 bg-ink-2 px-4 py-3 text-sm text-paper">
              Sua conta está criada, mas o acesso gratuito está fechado no momento.{" "}
              <Link
                href="/app/assinatura"
                className="font-bold text-brand-2 underline underline-offset-2"
              >
                Veja os planos
              </Link>{" "}
              para usar o construtor com IA, a hospedagem e a prospecção.
            </div>
          )
        )}

        {/* o que precisa de atenção agora */}
        {situacao.aviso && (
          <div
            className={`anim-entrada d1 rounded-xl border px-4 py-3 text-sm ${
              situacao.status === "atrasada"
                ? "border-warn/40 bg-warn/10 text-warn"
                : "border-danger/40 bg-danger/10 text-danger"
            }`}
          >
            {situacao.aviso}{" "}
            <Link href="/app/assinatura" className="font-bold underline underline-offset-2">
              Resolver agora
            </Link>
          </div>
        )}

        {/* como está o negócio */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.rotulo}
              className={`anim-entrada d${i + 1} group rounded-xl border border-white/10 bg-ink-2 p-4 transition hover:border-brand-2/40 hover:shadow-[0_10px_40px_-18px_rgba(108,92,231,0.7)]`}
            >
              <div className="font-display text-2xl font-extrabold tabular-nums transition group-hover:text-brand-2">
                {s.valor}
              </div>
              <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-paper-dim">
                {s.rotulo}
              </div>
            </div>
          ))}
        </div>

        {/* continuar de onde parou */}
        {recentes.length > 0 && (
          <div className="anim-entrada d3">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-paper-dim">
                Continuar de onde parou
              </h2>
              <Link href="/app/ia" className="text-xs font-semibold text-brand-2 hover:underline">
                ver todas as páginas →
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {recentes.map((p) => (
                <Link
                  key={p.id}
                  href={`/app/ia/${p.id}`}
                  className="group rounded-xl border border-white/10 bg-ink-2 p-4 transition hover:-translate-y-0.5 hover:border-brand-2/50 hover:shadow-[0_12px_40px_-18px_rgba(108,92,231,0.8)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-bold text-paper">{p.titulo}</span>
                    <span
                      className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        p.publicado ? "bg-ok/15 text-ok" : "bg-white/10 text-paper-dim"
                      }`}
                    >
                      {p.publicado ? "● no ar" : p.html ? "rascunho" : "vazia"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-paper-dim">
                    atualizada em {new Date(p.updated_at).toLocaleDateString("pt-BR")}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* para onde ir */}
        <div>
          <h2 className="anim-entrada d3 mb-3 text-sm font-semibold uppercase tracking-wide text-paper-dim">
            Seus agentes e ferramentas
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href={temConstrutor ? "/app/ia" : "/app/assinatura"}
              className={
                temConstrutor
                  ? "anim-entrada d3 group card-aurora rounded-2xl p-5 transition hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_rgba(108,92,231,0.8)]"
                  : "anim-entrada d3 group rounded-2xl border border-dashed border-white/15 bg-ink-2/60 p-5 transition hover:border-warn/50"
              }
            >
              <div className={`text-2xl ${temConstrutor ? "" : "opacity-60"}`}>
                {temConstrutor ? "✨" : "🔒"}
              </div>
              <h3
                className={`mt-2 font-display text-lg font-extrabold ${
                  temConstrutor ? "text-paper" : "text-paper-dim"
                }`}
              >
                Criador de páginas com IA
              </h3>
              <p className="mt-1 text-sm text-paper-dim">
                {temConstrutor
                  ? "Descreva o negócio e a IA escreve a página inteira — texto, design e imagens. Depois é conversar até ficar do seu jeito."
                  : "Descreva o negócio e a IA escreve a página inteira. Disponível para assinantes — clique para conhecer o plano."}
              </p>
            </Link>

            {temProspeccao ? (
              <Link
                href="/app/prospeccao"
                className="anim-entrada d4 group rounded-2xl border border-white/10 bg-ink-2 p-5 transition hover:-translate-y-1 hover:border-brand-2/50 hover:shadow-[0_20px_60px_-20px_rgba(108,92,231,0.6)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <Robo estado={estadoAgente} tamanho={64} />
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      estadoAgente === "trabalhando"
                        ? "anim-pulso-ok bg-ok/15 text-ok"
                        : estadoAgente === "dormindo"
                          ? "bg-warn/15 text-warn"
                          : "bg-white/10 text-paper-dim"
                    }`}
                  >
                    {estadoAgente === "trabalhando"
                      ? "● trabalhando agora"
                      : estadoAgente === "dormindo"
                        ? "◐ dormindo"
                        : "○ esperando instalação"}
                  </span>
                </div>
                <h3 className="mt-2 font-display text-lg font-extrabold text-paper">
                  Agente de prospecção
                </h3>
                <p className="mt-1 text-sm text-paper-dim">
                  {estadoAgente === "trabalhando" ? (
                    <>
                      Seu agente está varrendo o Google e cuidando do WhatsApp
                      {empresas > 0 && (
                        <>
                          {" "}
                          — <b className="text-paper">{empresas} empresas</b> na sua lista
                        </>
                      )}
                      .{" "}
                      <span className="pp-pontinhos text-ok">
                        <span />
                        <span />
                        <span />
                      </span>
                    </>
                  ) : estadoAgente === "dormindo" ? (
                    <>
                      Seu agente está dormindo. Abra o <b className="text-paper">LIGAR-AGENTE</b> no
                      seu computador para acordá-lo — a fila de trabalho espera por ele.
                    </>
                  ) : (
                    "Instale seu agente e ele passa a encontrar empresas sem site e a puxar conversa no WhatsApp — o vendedor que não dorme (só quando você deixa)."
                  )}
                </p>
              </Link>
            ) : (
              <Link
                href="/app/assinatura"
                className="anim-entrada d4 group rounded-2xl border border-dashed border-white/15 bg-ink-2/60 p-5 transition hover:border-warn/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <Robo estado="novo" tamanho={64} />
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-paper-dim">
                    🔒 plano Agência
                  </span>
                </div>
                <h3 className="mt-2 font-display text-lg font-extrabold text-paper-dim">
                  Agente de prospecção
                </h3>
                <p className="mt-1 text-sm text-paper-dim">
                  Um agente que encontra empresas sem site e aborda no WhatsApp por você. Disponível
                  no plano <span className="font-bold text-warn">Agência</span> — clique para
                  conhecer.
                </p>
              </Link>
            )}

            <Link
              href="/app/creditos"
              className="anim-entrada d5 group rounded-2xl border border-white/10 bg-ink-2 p-5 transition hover:-translate-y-1 hover:border-brand-2/50 hover:shadow-[0_20px_60px_-20px_rgba(108,92,231,0.6)]"
            >
              <div className="text-2xl">⚡</div>
              <h3 className="mt-2 font-display text-lg font-extrabold text-paper">Créditos de IA</h3>
              <p className="mt-1 text-sm text-paper-dim">
                {conta.fonte === "propria"
                  ? "Você usa a sua própria chave da Anthropic — as gerações saem direto na sua conta."
                  : `Saldo atual: ${emDolar(conta.saldo)}. Compre mais no cartão ou Pix, ou use a sua própria chave.`}
              </p>
            </Link>

            <Link
              href="/app/assinatura"
              className="anim-entrada d5 group rounded-2xl border border-white/10 bg-ink-2 p-5 transition hover:-translate-y-1 hover:border-brand-2/50 hover:shadow-[0_20px_60px_-20px_rgba(108,92,231,0.6)]"
            >
              <div className="text-2xl">📄</div>
              <h3 className="mt-2 font-display text-lg font-extrabold text-paper">Assinatura</h3>
              <p className="mt-1 text-sm text-paper-dim">
                {situacao.status === "ativa"
                  ? "Em dia. Veja faturas, troque o cartão ou gerencie o plano."
                  : situacao.status === "atrasada"
                    ? "Pagamento pendente — resolva para não perder o acesso."
                    : situacao.status === "suspensa"
                      ? "Suspensa por falta de pagamento — reative no cartão ou no Pix."
                      : plano !== "free"
                        ? "Seu plano foi liberado pelo suporte — tudo em dia, sem cobrança."
                        : "Veja os planos e assine para liberar todos os recursos."}
              </p>
            </Link>

            <Link
              href="/app/conta"
              className="anim-entrada d6 group rounded-2xl border border-white/10 bg-ink-2 p-5 transition hover:-translate-y-1 hover:border-brand-2/50 hover:shadow-[0_20px_60px_-20px_rgba(108,92,231,0.6)] sm:col-span-2"
            >
              <div className="text-2xl">👤</div>
              <h3 className="mt-2 font-display text-lg font-extrabold text-paper">Minha conta</h3>
              <p className="mt-1 text-sm text-paper-dim">
                Seu nome, e-mail de acesso e senha — e o resumo de tudo que você tem contratado.
              </p>
            </Link>
          </div>
        </div>

        {/* ferramentas internas — só o dono enxerga */}
        {admin && (
          <div className="anim-entrada d6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-warn">
              Ferramentas internas (só você vê)
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { href: "/app/sites", emoji: "🧱", titulo: "Sites por blocos" },
                { href: "/app/templates", emoji: "🗂️", titulo: "Templates" },
                { href: "/app/admin", emoji: "👑", titulo: "Admin" },
              ].map((f) => (
                <Link
                  key={f.href}
                  href={f.href}
                  className="flex items-center gap-3 rounded-xl border border-warn/25 bg-warn/5 px-4 py-3 text-sm font-bold text-paper transition hover:border-warn/50"
                >
                  <span>{f.emoji}</span>
                  {f.titulo}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- Prospector -------------------------------- */

/*
 * A home de quem assina SÓ a prospecção. Três andares, como a principal:
 * atenção agora (pagamento) → como foi o trabalho (números da prospecção,
 * não de páginas) → para onde ir. Sem crédito de IA, sem criador de site,
 * sem "assinar" — ele JÁ assinou, e nada aqui gasta nada.
 */
async function HomeProspector({
  orgId,
  nome,
  avisoAssinatura,
  teste = null,
}: {
  orgId: string;
  nome: string;
  avisoAssinatura: string | null;
  /* Em teste grátis (ativo ou vencido); null para assinante. */
  teste?: import("@/lib/painel/teste").SituacaoTeste | null;
}) {
  const supabase = await createClient();
  const desde = desde30Dias();
  const [{ count: empresas }, enviadasRes, respostasRes, { count: naFila }, { data: ag }] =
    await Promise.all([
      supabase.from("prospeccao").select("id", { count: "exact", head: true }).eq("org_id", orgId),
      supabase
        .from("prospeccao_mensagens")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "enviada")
        .gte("created_at", desde),
      supabase
        .from("prospeccao_mensagens")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .not("resposta_em", "is", null)
        .gte("created_at", desde),
      supabase
        .from("prospeccao_mensagens")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "pendente"),
      supabase
        .from("agentes")
        .select("ultimo_contato")
        .eq("org_id", orgId)
        .order("ultimo_contato", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const linhaAg = ag as { ultimo_contato: string | null } | null;
  const estadoAgente: EstadoRobo = !linhaAg
    ? "novo"
    : linhaAg.ultimo_contato && Date.now() - new Date(linhaAg.ultimo_contato).getTime() < 15 * 60_000
      ? "trabalhando"
      : "dormindo";

  const stats = [
    { rotulo: "Empresas na lista", valor: String(empresas ?? 0) },
    { rotulo: "Mensagens (30 dias)", valor: String(enviadasRes.count ?? 0) },
    { rotulo: "Respostas (30 dias)", valor: String(respostasRes.count ?? 0) },
    { rotulo: "Na fila de envio", valor: String(naFila ?? 0) },
  ];

  return (
    <div className="painel-wrap flex flex-col gap-8">
      <div className="anim-entrada flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-paper-dim">{saudacao()} 👋</p>
          <h1 className="mt-0.5 font-display text-3xl font-extrabold">{nome}</h1>
          <p className="mt-1.5 text-sm text-paper-dim">
            Plano{" "}
            {teste ? (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  teste.acabou ? "bg-danger/15 text-danger" : "bg-warn/15 text-warn"
                }`}
              >
                {teste.acabou
                  ? "Teste grátis · encerrado"
                  : `Teste grátis · ${teste.diasRestantes === 1 ? "último dia" : `${teste.diasRestantes} dias restantes`}`}
              </span>
            ) : (
              <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs font-bold text-brand-2">
                Prospector · ativo
              </span>
            )}
          </p>
        </div>
        {teste?.acabou ? (
          <Link
            href="/app/assinatura?teste=acabou"
            className="rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-brand-2"
          >
            Assinar o Prospector →
          </Link>
        ) : (
          <Link
            href="/app/prospeccao"
            className="rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-brand-2"
          >
            🎯 Abrir a prospecção
          </Link>
        )}
      </div>

      {/*
        O teste, em cima de tudo. Enquanto vale: quantos dias e os tetos, com
        o botão de assinar já ali — quem gostou não deveria ter que procurar
        onde paga. Vencido: o que acontece agora, e o mesmo botão.
      */}
      {teste && (
        <div
          className={`anim-entrada d1 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-sm ${
            teste.acabou ? "border-danger/40 bg-danger/10" : "border-warn/40 bg-warn/10"
          }`}
        >
          <div className="min-w-0">
            {teste.acabou ? (
              <>
                <p className="font-bold text-danger">⏰ Seu teste grátis de 7 dias terminou.</p>
                <p className="mt-0.5 text-paper-dim">
                  Sua lista, seu funil e suas conversas continuam guardados. Assinando, o agente
                  volta a buscar e enviar hoje mesmo — sem teto por dia.
                </p>
              </>
            ) : (
              <>
                <p className="font-bold text-warn">
                  🎁 Teste grátis:{" "}
                  {teste.diasRestantes === 1 ? "hoje é o último dia" : `${teste.diasRestantes} dias restantes`}
                </p>
                <p className="mt-0.5 text-paper-dim">
                  Até 30 empresas encontradas e 30 mensagens por dia. Assinando, o teto some e
                  nada do que você fez se perde.
                </p>
              </>
            )}
          </div>
          <Link
            href="/app/assinatura"
            className={`flex-none rounded-lg px-4 py-2 text-sm font-bold text-white transition ${
              teste.acabou ? "bg-danger hover:brightness-110" : "bg-brand hover:bg-brand-2"
            }`}
          >
            {teste.acabou ? "Assinar agora" : "Assinar o Prospector"}
          </Link>
        </div>
      )}

      {avisoAssinatura && (
        <div className="anim-entrada d1 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {avisoAssinatura}{" "}
          <Link href="/app/assinatura" className="font-bold underline underline-offset-2">
            Resolver agora
          </Link>
        </div>
      )}

      {/*
        A primeira coisa que o assinante novo vê — antes dos números, que
        estão todos zerados e não dizem nada a quem acabou de comprar.
        Enquanto não existe agente, esta é a única tarefa que importa; some
        sozinho no instante em que ele instala.
      */}
      {estadoAgente === "novo" && (
        <Link
          href="/app/comecar"
          className="anim-entrada d1 card-aurora group flex flex-wrap items-center gap-5 rounded-2xl p-6 transition hover:-translate-y-0.5"
        >
          <Robo estado="novo" tamanho={76} cor="#4285F4" corClara="#8ab4f8" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-2">Primeiro acesso</p>
            <h2 className="mt-1 font-display text-xl font-extrabold text-paper">
              Comece por aqui: 4 passos, uma vez só
            </h2>
            <p className="mt-1.5 max-w-xl text-sm text-paper">
              Baixe o agente, instale e reinicie o computador. Pronto — a partir daí ele liga
              sozinho toda vez que você ligar a máquina, e você só escolhe o ramo e a cidade.
            </p>
          </div>
          <span className="flex-none rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-lg transition group-hover:bg-brand-2">
            Ver o passo a passo →
          </span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.rotulo}
            className={`anim-entrada d${i + 1} rounded-xl border border-white/10 bg-ink-2 p-4`}
          >
            <div className="font-display text-2xl font-extrabold tabular-nums">{s.valor}</div>
            <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-paper-dim">
              {s.rotulo}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/app/prospeccao"
          className="anim-entrada d3 card-aurora rounded-2xl p-5 transition hover:-translate-y-1"
        >
          <div className="text-2xl">🔎</div>
          <h3 className="mt-2 font-display text-lg font-extrabold text-paper">Encontrar clientes</h3>
          <p className="mt-1 text-sm text-paper-dim">
            Diga o ramo e o bairro — o assistente varre o Google Maps e monta a sua lista com
            telefone, avaliações e nota de potencial.
          </p>
        </Link>

        <Link
          // Sem agente, este card leva ao tutorial: mandar para a tela de
          // abordagem quem ainda não instalou é mostrar uma tela vazia.
          href={estadoAgente === "novo" ? "/app/comecar" : "/app/prospeccao/abordagem"}
          className="anim-entrada d3 rounded-2xl border border-white/10 bg-ink-2 p-5 transition hover:-translate-y-1 hover:border-brand-2/50"
        >
          <div className="flex items-start justify-between gap-3">
            {/* Azul do Google: no Prospector o robô veste a cor do produto. */}
          <Robo estado={estadoAgente} tamanho={56} cor="#4285F4" corClara="#8ab4f8" />
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                estadoAgente === "trabalhando"
                  ? "anim-pulso-ok bg-ok/15 text-ok"
                  : estadoAgente === "dormindo"
                    ? "bg-warn/15 text-warn"
                    : "bg-white/10 text-paper-dim"
              }`}
            >
              {estadoAgente === "trabalhando"
                ? "● trabalhando agora"
                : estadoAgente === "dormindo"
                  ? "◐ dormindo"
                  : "○ esperando instalação"}
            </span>
          </div>
          <h3 className="mt-2 font-display text-lg font-extrabold text-paper">Abordar no WhatsApp</h3>
          <p className="mt-1 text-sm text-paper-dim">
            {estadoAgente === "novo"
              ? "Instale o assistente no seu computador (2 minutos, o painel te guia) e conecte o seu WhatsApp."
              : estadoAgente === "dormindo"
                ? "Seu assistente está dormindo — abra o LIGAR-AGENTE no seu computador para ele voltar ao trabalho."
                : "Sua mensagem, o seu ritmo, o remarketing em quem não respondeu — tudo daqui."}
          </p>
        </Link>

        <Link
          href="/app/assinatura"
          className="anim-entrada d4 rounded-2xl border border-white/10 bg-ink-2 p-5 transition hover:-translate-y-1 hover:border-brand-2/50"
        >
          <div className="text-2xl">📄</div>
          <h3 className="mt-2 font-display text-lg font-extrabold text-paper">Assinatura</h3>
          <p className="mt-1 text-sm text-paper-dim">
            Plano Prospector em dia. Veja faturas, troque o cartão ou cancele quando quiser.
          </p>
        </Link>

        <Link
          href="/app/conta"
          className="anim-entrada d4 rounded-2xl border border-white/10 bg-ink-2 p-5 transition hover:-translate-y-1 hover:border-brand-2/50"
        >
          <div className="text-2xl">👤</div>
          <h3 className="mt-2 font-display text-lg font-extrabold text-paper">Minha conta</h3>
          <p className="mt-1 text-sm text-paper-dim">Seu nome, e-mail de acesso e senha.</p>
        </Link>
      </div>
    </div>
  );
}
