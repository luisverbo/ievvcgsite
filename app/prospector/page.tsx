import Link from "next/link";
import { precoEmReais } from "@/lib/pagamentos/planos";
import { videoDaLanding } from "@/lib/landing";
import { pixelDasVendas } from "@/lib/vendas-pixel";
import Pixel, { PixelCheckout } from "@/components/vendas/Pixel";
import Analytics from "@/components/site/Analytics";
import { ORG_VENDAS, PAGINA_VENDAS } from "@/lib/vendas-metricas";
import Robo from "@/components/painel/Robo";
import Image from "next/image";
import { printDaLanding } from "@/lib/vendas-prints";

/*
 * A landing do PROSPECTOR — página de ANÚNCIO, não de site institucional.
 *
 * Separada da landing principal de propósito: quem chega aqui veio de um
 * anúncio sobre prospecção e não pode tropeçar em "criador de sites" — uma
 * página, uma promessa, um botão. Por isso não há menu, e o rodapé é mínimo.
 *
 * Identidade própria, deliberadamente OPOSTA ao resto do produto: fundo
 * claro (o site é escuro) e as cores do Google — porque o produto É garimpar
 * o Google Maps, e a paleta conta a história sozinha. O verde do botão é o
 * do WhatsApp: a promessa termina lá.
 *
 * A ORDEM dos blocos segue a revisão de um copywriter de SaaS: produto na
 * tela logo no hero, vídeo em seguida, dor → passos → fluxo → painel →
 * oferta → garantia → para quem é → FAQ → CTA. Cada bloco empurra para o
 * seguinte; nenhum repete o anterior.
 *
 * REGRA DE HONESTIDADE, que vale mais que qualquer copy: a página promete o
 * que o produto FAZ. O Agente encontra, monta a mensagem com o nome de cada
 * empresa (variáveis + variações de frase) e envia. Ele NÃO escreve texto
 * livre por IA e NÃO conversa sozinho — então a página não diz que faz.
 *
 * Efeitos 100% CSS: nada de biblioteca, nada de JS — a página de anúncio
 * precisa abrir instantânea no 4G, e cada kb aqui é taxa de conversão.
 */

export const revalidate = 3600;

export const metadata = {
  title: "Prospector — Pare de perder horas procurando clientes",
  description:
    "Para quem vende para empresas pelo WhatsApp: um Agente de IA encontra empresas no Google Maps, monta a abordagem com o nome de cada uma e envia pelo seu WhatsApp, com remarketing automático. R$97/mês, sem cobrança por lead. Garantia de 7 dias.",
};

/* ------------------------------ dados da página --------------------------- */

const HOJE = [
  "Abrir o Google e pesquisar empresa por empresa",
  "Copiar telefone no caderno — e descobrir depois que era fixo",
  "Escrever a mesma mensagem 40 vezes e torcer para o WhatsApp não bloquear",
  "Esquecer quem já respondeu e quem você já chamou",
  "Terminar o dia sem uma conversa de venda aberta",
];

const COM_PROSPECTOR = [
  "Você escolhe o ramo e a região",
  "O Agente encontra e organiza as empresas, com telefone e avaliações",
  "Cada empresa recebe a mensagem com o nome dela, o bairro e as avaliações",
  "Quem não respondeu entra no remarketing automático",
  "As respostas ficam organizadas no seu painel",
];

const PASSOS: { cor: string; titulo: string; texto: string; visual: React.ReactNode }[] = [
  {
    cor: "#4285F4",
    titulo: "Escolha o ramo e a região",
    texto:
      "Clínicas, contadores, academias, escritórios, lojas, oficinas — qualquer tipo de empresa presente no Google Maps. Mais de 90 categorias prontas, ou digite a sua. E filtre: só quem tem WhatsApp, só quem não tem site, faixa de avaliações.",
    visual: (
      <div className="rounded-full border border-black/10 bg-white px-4 py-2.5 shadow-sm">
        <span className="text-sm text-[#5f6672]">
          🔎 <b className="text-[#1a1c22]">clínicas de estética</b> em{" "}
          <b className="text-[#1a1c22]">Campinas</b>
          <span className="pv-caret" />
        </span>
      </div>
    ),
  },
  {
    cor: "#EA4335",
    titulo: "O Agente encontra as empresas",
    texto:
      "Ele varre o Google Maps como uma pessoa pesquisaria e organiza nome, telefone, WhatsApp, endereço, site e avaliações em um único painel. Você acorda com a lista pronta.",
    visual: (
      <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-white p-3 shadow-sm">
        <span className="text-lg">🗺️</span>
        <div className="flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-black/10">
            <div className="pv-barra h-full rounded-full bg-[#EA4335]" style={{ width: "78%" }} />
          </div>
          <p className="mt-1 text-[11px] text-[#5f6672]">47 de 60 empresas lidas · 41 com WhatsApp</p>
        </div>
      </div>
    ),
  },
  {
    cor: "#FBBC05",
    titulo: "Cada empresa recebe a abordagem com o nome dela",
    texto:
      "Você escolhe um modelo pronto para o seu tipo de venda — ou escreve o seu. O Agente preenche o nome da empresa, o bairro e as avaliações, varia as frases a cada envio e manda pelo SEU WhatsApp, no ritmo de uma pessoa.",
    visual: (
      <div className="rounded-xl border border-black/10 bg-white p-3 text-left text-xs leading-relaxed text-[#5f6672] shadow-sm">
        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[#b8860b]">
          ✉️ montada para esta empresa
        </span>
        Oi! Encontrei a <b className="text-[#1a1c22]">Clínica Bella Pele</b> pesquisando clínicas
        no Cambuí e vi que vocês têm <b className="text-[#1a1c22]">132 avaliações</b>. Eu trabalho
        com plano de saúde empresarial…
      </div>
    ),
  },
  {
    cor: "#34A853",
    titulo: "Quem não respondeu entra no remarketing",
    texto:
      "A maioria dos leads não diz “não” — só esquece. O Agente volta a falar com quem ficou em silêncio, em até 3 toques nos dias que você escolher. Quem pede para sair, sai para sempre.",
    visual: (
      <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-white p-3 text-xs text-[#5f6672] shadow-sm">
        <span className="text-lg">🔁</span>
        <span>
          4 dias sem resposta → <b className="text-[#34A853]">2º toque enviado</b> · 3º em 7 dias
        </span>
      </div>
    ),
  },
];

const FLUXO = [
  {
    emoji: "✉️",
    titulo: "Mensagem com o nome da empresa",
    texto:
      "Nome, bairro e avaliações de cada negócio entram no texto, e as frases variam a cada envio. Não é o mesmo texto colado 40 vezes.",
  },
  {
    emoji: "⏳",
    titulo: "Cadência controlada",
    texto:
      "Teto por dia e intervalo aleatório entre uma mensagem e outra — você define. O envio parece o que é: uma pessoa trabalhando.",
  },
  {
    emoji: "🚫",
    titulo: "Opt-out automático",
    texto:
      "Escreveu “não quero” ou “me tira”? Sai de todas as filas na hora, para sempre. É o que separa prospecção de spam.",
  },
  {
    emoji: "🔒",
    titulo: "Seu painel e seus dados",
    texto:
      "Seu WhatsApp, conectado por QR — nada de número alugado. E a lista é sua: exporte em planilha quando quiser.",
  },
];

const ETIQUETAS = ["🔥 Lead quente", "📞 Ligar na sexta", "📄 Proposta enviada", "❄️ Sem interesse", "⏰ Fazer follow-up"];

const NICHOS_MARQUEE = [
  "🦷 Dentistas", "⚖️ Advocacia", "💇 Salões", "💪 Academias", "🏥 Clínicas",
  "🚗 Oficinas", "🍕 Pizzarias", "💊 Farmácias", "🏨 Pousadas", "📐 Arquitetos",
  "✂️ Barbearias", "🐾 Pet shops", "🏠 Imobiliárias", "💅 Esmalterias", "📚 Escolas",
  "🔧 Autopeças", "🌸 Floriculturas", "👓 Óticas", "🧾 Contadores", "🍰 Confeitarias",
  "🧱 Mat. construção", "🥩 Açougues", "📷 Fotógrafos", "🎉 Buffets",
];

const PERGUNTAS = [
  {
    p: "Preciso entender de tecnologia?",
    r: "Não. Você cria sua conta, conecta o WhatsApp pelo QR Code (igual ao WhatsApp Web) e escolhe o ramo e a região. O painel orienta os próximos passos, um de cada vez.",
  },
  {
    p: "O Agente trabalha 24 horas?",
    r: "Ele trabalha enquanto o seu computador estiver ligado — liga junto com ele, sozinho, sem você abrir nada. Quando você desliga, a fila fica salva e continua depois. Isso é proposital: mensagem saindo às 3 da manhã é o que denuncia robô.",
  },
  {
    p: "Preciso de outro número?",
    r: "Não. Ele usa o seu WhatsApp, conectado uma vez pelo QR — as conversas ficam no seu celular como sempre. Para separar atendimento de prospecção, muita gente prefere um chip dedicado; funciona nos dois casos.",
  },
  {
    p: "Existe cobrança por empresa ou por mensagem?",
    r: "Não. Você paga só a mensalidade. Busque e aborde quantas empresas quiser, dentro do ritmo e dos limites que você configurar.",
  },
  {
    p: "Meu número pode ser bloqueado?",
    r: "Nenhuma ferramenta pode garantir risco zero — e desconfie de quem garantir. O Prospector dá os controles que reduzem esse risco: mensagem com o nome de cada empresa e frases variadas, teto diário, intervalo entre envios e opt-out automático. O uso deve respeitar as políticas do WhatsApp. Comece devagar: 15 a 20 por dia na primeira semana.",
  },
  {
    p: "E se eu não souber o que escrever?",
    r: "Já vem pronto. Você escolhe o seu tipo de venda (seguros, plano de saúde, consórcio, representação, contabilidade, energia solar, marketing ou genérico) e o texto aparece na tela, seguindo as regras que protegem o seu número. Depois é só ajustar as palavras do seu jeito.",
  },
  {
    p: "De onde vêm os contatos?",
    r: "Do Google Maps, que é público. O Agente pesquisa como uma pessoa pesquisaria e organiza tudo: nome, telefone, avaliações, endereço, site. Você pode filtrar para trazer só quem tem WhatsApp.",
  },
  {
    p: "Consigo levar a lista para fora?",
    r: "Sim, num clique. “Exportar planilha” baixa em CSV — abre no Excel e no Google Sheets. Dá para exportar só os números de WhatsApp, só os contatos, ou tudo. A lista é sua, não fica presa aqui.",
  },
  {
    p: "Posso cancelar quando quiser?",
    r: "Sim. Não existe fidelidade nem multa. O cancelamento é feito direto no painel, em dois cliques — sem ligar para ninguém.",
  },
];

/* --------------------------------- página --------------------------------- */

export default async function ProspectorPage() {
  const preco = precoEmReais("prospector");
  const video = await videoDaLanding("prospector");
  // Prints reais do painel (telefones embaçados). Sem os arquivos, o bloco some.
  const prints = {
    funil: printDaLanding("funil"),
    abordar: printDaLanding("quem-abordar"),
    leads: printDaLanding("leads"),
  };
  const pixel = await pixelDasVendas();
  const suporte = (process.env.NEXT_PUBLIC_WHATSAPP_VENDAS ?? "").replace(/\D/g, "");

  return (
    <div className="pv min-h-screen overflow-x-hidden bg-[#f7f9fe] pb-20 text-[#1a1c22] md:pb-0">
      <Pixel pixel={pixel} />
      <PixelCheckout />
      <Analytics orgId={ORG_VENDAS} siteId={PAGINA_VENDAS.prospector} />

      <style>{`
        .pv { scroll-behavior: smooth; }
        .pv [id] { scroll-margin-top: 5.5rem; }

        @keyframes pv-flutuar { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
        .pv-flutua { animation: pv-flutuar 5s ease-in-out infinite; }

        @keyframes pv-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .pv-marquee { animation: pv-marquee 36s linear infinite; }
        .pv-marquee:hover { animation-play-state: paused; }

        @keyframes pv-pontinho { 0%,60%,100% { transform: translateY(0); opacity:.4 } 30% { transform: translateY(-4px); opacity:1 } }
        .pv-dots span { display:inline-block; width:5px; height:5px; margin:0 1.5px; border-radius:99px; background:#5f6672; animation: pv-pontinho 1.2s infinite; }
        .pv-dots span:nth-child(2){ animation-delay:.15s } .pv-dots span:nth-child(3){ animation-delay:.3s }

        @keyframes pv-crescer { from { width: 0; } }
        .pv-barra { animation: pv-crescer 1.4s ease-out both; }

        @keyframes pv-piscar { 50% { opacity: 0; } }
        .pv-caret { display:inline-block; width:2px; height:1em; margin-left:2px; vertical-align:-2px; background:#4285F4; animation: pv-piscar 1s step-end infinite; }

        @keyframes pv-pulso { 0%,100% { box-shadow: 0 0 0 0 rgba(52,168,83,.55); } 70% { box-shadow: 0 0 0 8px rgba(52,168,83,0); } }
        .pv-pulso { animation: pv-pulso 1.8s infinite; }

        /* Linha a linha, o painel "recebe" as empresas — a busca acontecendo. */
        @keyframes pv-chegar { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: none; } }
        .pv-chega { animation: pv-chegar .6s ease-out both; }

        /* Reveal por rolagem: sem suporte, tudo aparece normal. */
        .pv-rev { opacity: 1; }
        @supports (animation-timeline: view()) {
          @keyframes pv-entrar { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: none; } }
          .pv-rev { animation: pv-entrar .9s ease-out both; animation-timeline: view(); animation-range: entry 0% entry 42%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pv *, .pv *::before, .pv *::after { animation: none !important; }
        }
      `}</style>

      {/* faixa do topo */}
      <div className="bg-[#1a1c22] px-4 py-2 text-center text-xs font-semibold text-white sm:text-sm">
        Para quem vende para empresas pelo WhatsApp · sem fidelidade
      </div>

      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <span className="font-display text-xl font-extrabold tracking-tight">
            <span className="text-[#4285F4]">P</span>
            <span className="text-[#EA4335]">r</span>
            <span className="text-[#FBBC05]">o</span>
            <span className="text-[#4285F4]">s</span>
            <span className="text-[#34A853]">p</span>
            <span className="text-[#EA4335]">e</span>ctor
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/login?p=prospector"
              className="text-sm font-semibold text-[#5f6672] transition hover:text-[#1a1c22]"
            >
              Entrar
            </Link>
            {/* Leva ao PREÇO, não ao cadastro: ninguém cria conta antes de ver o valor. */}
            <Link
              data-track="Topo · Ver preço"
              href="#preco"
              className="rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_-8px_rgba(37,211,102,.7)] transition hover:-translate-y-0.5 hover:brightness-105"
            >
              Ver preço e começar
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ============================== HERO ============================== */}
        <section className="relative px-5 pb-16 pt-14 sm:pt-20">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1fr]">
            <div>
              <span className="mb-4 inline-block rounded-full border border-[#4285F4]/30 bg-[#4285F4]/10 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wide text-[#1967d2]">
                Prospecção ativa com Agente de IA + WhatsApp
              </span>
              <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
                Pare de perder horas{" "}
                <span className="bg-gradient-to-r from-[#4285F4] via-[#EA4335] to-[#34A853] bg-clip-text text-transparent">
                  procurando clientes.
                </span>
              </h1>
              <p className="mt-4 font-display text-xl font-bold text-[#1a1c22] sm:text-2xl">
                O Prospector encontra e aborda empresas por você.
              </p>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-[#5f6672]">
                Escolha o ramo e a região. O <b className="text-[#1a1c22]">Agente de IA</b> encontra
                as empresas no Google Maps, monta a mensagem com o nome de cada uma e envia pelo seu
                WhatsApp — com remarketing automático em até 3 toques para quem não respondeu.
              </p>
              <div className="mt-8">
                <Link
                  data-track="Hero · Prospectar no automático"
                  href="#preco"
                  className="inline-block rounded-full bg-[#25D366] px-8 py-4 text-base font-bold text-white shadow-[0_14px_36px_-10px_rgba(37,211,102,.8)] transition hover:-translate-y-0.5 hover:brightness-105 sm:text-lg"
                >
                  Quero prospectar no automático →
                </Link>
              </div>
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#5f6672]">
                <span className="font-bold text-[#1a1c22]">R$ {preco}/mês</span>
                <span>·</span>
                <span className="font-bold text-[#188038]">🛡️ 7 dias de garantia</span>
                <span>·</span>
                <span>cancele quando quiser</span>
              </p>
              {/* a faixa de funcionalidades: o produto inteiro em uma linha */}
              <p className="mt-6 flex flex-wrap gap-x-2 gap-y-1 text-xs font-bold uppercase tracking-wide text-[#5f6672]">
                {["Google Maps", "Agente de IA", "WhatsApp automático", "Remarketing", "CRM"].map((f, i) => (
                  <span key={f} className="flex items-center gap-2">
                    {i > 0 && <span className="text-[#c4c9d4]">·</span>}
                    {f}
                  </span>
                ))}
              </p>
            </div>

            {/*
              O PRODUTO na tela, no lugar de uma ilustração abstrata. É o painel
              real reproduzido: a busca, o Agente trabalhando e a lista chegando
              linha a linha. Quem vê isso entende o produto antes de ler.
            */}
            <div className="relative mx-auto w-full max-w-lg">
              <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_30px_80px_-30px_rgba(66,133,244,.35)]">
                {/* barra da janela */}
                <div className="flex items-center gap-2 border-b border-black/5 bg-[#f7f9fe] px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#EA4335]/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FBBC05]/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#34A853]/70" />
                  <span className="ml-3 text-[11px] font-semibold text-[#5f6672]">Prospecção 🎯</span>
                  <span className="ml-auto flex items-center gap-1.5 rounded-full bg-[#34A853]/10 px-2 py-0.5 text-[10px] font-bold text-[#188038]">
                    <span className="pv-pulso h-1.5 w-1.5 rounded-full bg-[#34A853]" />
                    Agente trabalhando
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 rounded-full border border-black/10 bg-[#f7f9fe] px-3.5 py-2 text-xs">
                    <span>🔎</span>
                    <span className="text-[#5f6672]">
                      <b className="text-[#1a1c22]">clínicas de estética</b> em <b className="text-[#1a1c22]">Campinas</b>
                    </span>
                    <span className="ml-auto rounded-full bg-[#4285F4]/10 px-2 py-0.5 text-[10px] font-bold text-[#1967d2]">
                      só com WhatsApp
                    </span>
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    {[
                      { nome: "Clínica Bella Pele", info: "⭐ 4,8 · 132 avaliações · Cambuí", tag: "🔥 quente", resp: "respondeu", d: ".2s" },
                      { nome: "Estética Renova", info: "⭐ 4,9 · 88 avaliações · Taquaral", tag: "📞 ligar sexta", resp: null, d: ".7s" },
                      { nome: "Espaço Lumina", info: "⭐ 4,6 · 210 avaliações · Centro", tag: null, resp: null, d: "1.2s" },
                      { nome: "Studio Pele & Forma", info: "⭐ 4,7 · 54 avaliações · Barão Geraldo", tag: null, resp: null, d: "1.7s" },
                    ].map((l) => (
                      <div
                        key={l.nome}
                        className="pv-chega flex items-center gap-3 rounded-2xl border border-black/5 bg-[#f7f9fe] px-3 py-2.5"
                        style={{ animationDelay: l.d }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{l.nome}</p>
                          <p className="text-[11px] text-[#5f6672]">{l.info}</p>
                        </div>
                        <span className="flex-none rounded-full bg-[#25D366]/15 px-2 py-0.5 text-[10px] font-bold text-[#128C4A]">
                          WhatsApp ✓
                        </span>
                        {l.tag && (
                          <span className="hidden flex-none rounded-full bg-[#FBBC05]/20 px-2 py-0.5 text-[10px] font-bold text-[#8a6d00] sm:inline">
                            {l.tag}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-[#5f6672]">
                    <span>47 de 60 empresas lidas</span>
                    <span className="font-bold text-[#188038]">41 com WhatsApp</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/10">
                    <div className="pv-barra h-full rounded-full bg-[#4285F4]" style={{ width: "78%" }} />
                  </div>
                </div>
              </div>

              {/* a resposta chegando: o momento que vende */}
              <div className="pv-flutua absolute -bottom-6 -right-3 w-60 rounded-2xl border border-black/10 bg-white p-3 shadow-xl sm:-right-8">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#188038]">💬 resposta agora</p>
                <p className="mt-1 text-xs font-bold">Clínica Bella Pele</p>
                <p className="mt-0.5 rounded-xl bg-[#d9fdd3] px-2.5 py-1.5 text-xs text-[#1a1c22]">
                  Pode mandar sim! 👍
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================== VÍDEO ============================= */}
        {video && (
          <section className="px-5 pb-20 pt-6">
            <div className="pv-rev mx-auto max-w-3xl text-center">
              <h2 className="font-display text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl">
                Veja o Prospector funcionando em dois minutos
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-[#5f6672]">
                Uma prospecção real: da escolha do ramo até as empresas organizadas no painel e as
                primeiras abordagens saindo.
              </p>
            </div>
            <div className="pv-rev mx-auto mt-8 max-w-3xl overflow-hidden rounded-3xl border border-black/10 bg-black shadow-[0_30px_80px_-30px_rgba(26,28,34,.5)]">
              <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
                <iframe
                  src={video.embedUrl}
                  title="Como funciona o Prospector"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              </div>
            </div>
            <p className="pv-rev mt-6 text-center">
              <Link
                data-track="Vídeo · Primeira prospecção"
                href="#preco"
                className="inline-block rounded-full bg-[#25D366] px-7 py-3 text-base font-bold text-white shadow-[0_12px_32px_-10px_rgba(37,211,102,.8)] transition hover:-translate-y-0.5 hover:brightness-105"
              >
                Quero fazer minha primeira prospecção →
              </Link>
            </p>
          </section>
        )}

        {/* ========================== PROVA REAL =========================== */}
        {/*
          O painel de verdade, sem retoque além dos telefones embaçados. Um
          print real vale mais que qualquer ilustração: o visitante vê os
          números de uma conta em uso e entende que o produto existe e
          trabalha. O bloco só aparece quando os arquivos existem.
        */}
        {prints.funil && (
          <section className="bg-white px-5 py-20">
            <div className="pv-rev mx-auto max-w-3xl text-center">
              <span className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#34A853]">
                Prova real
              </span>
              <h2 className="mt-3 font-display text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
                Isto é o painel <span className="text-[#34A853]">funcionando de verdade</span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-[#5f6672]">
                Print real de uma conta em uso, sem retoque — só os telefones e os nomes das pessoas
                estão embaçados. Cada coluna é uma etapa: encontradas, abordadas, responderam,
                fechadas.
              </p>
            </div>

            <div className="pv-rev mx-auto mt-10 max-w-5xl overflow-hidden rounded-3xl border border-black/10 bg-[#1a1c22] shadow-[0_30px_80px_-30px_rgba(26,28,34,.5)]">
              <Image
                src={prints.funil.src}
                width={prints.funil.largura}
                height={prints.funil.altura}
                alt="Funil do Prospector: empresas novas, contactadas, que responderam e fechadas, em colunas"
                className="h-auto w-full"
                sizes="(max-width: 1024px) 100vw, 1024px"
                priority={false}
              />
            </div>
            <p className="pv-rev mx-auto mt-3 max-w-2xl text-center text-sm text-[#5f6672]">
              O funil: <b className="text-[#1a1c22]">236 empresas encontradas</b> pelo Agente,{" "}
              <b className="text-[#1a1c22]">50 abordadas</b>, respostas e fechamentos cada um na sua
              coluna — arrasta o card e pronto.
            </p>

            {(prints.abordar || prints.leads) && (
              <div className="pv-rev mx-auto mt-8 grid max-w-5xl gap-6 md:grid-cols-2">
                {prints.abordar && (
                  <figure>
                    <div className="overflow-hidden rounded-3xl border border-black/10 bg-[#1a1c22] shadow-[0_24px_70px_-35px_rgba(26,28,34,.5)]">
                      <Image
                        src={prints.abordar.src}
                        width={prints.abordar.largura}
                        height={prints.abordar.altura}
                        alt="Tela Quem abordar: 122 empresas com celular prontas para chamar, da maior nota para a menor"
                        className="h-auto w-full"
                        sizes="(max-width: 768px) 100vw, 500px"
                      />
                    </div>
                    <figcaption className="mt-3 text-sm text-[#5f6672]">
                      <b className="text-[#1a1c22]">122 prontas para chamar</b> — só empresas com
                      celular que ainda não foram abordadas, da maior nota para a menor. Marca a
                      lista inteira num clique.
                    </figcaption>
                  </figure>
                )}
                {prints.leads && (
                  <figure>
                    <div className="overflow-hidden rounded-3xl border border-black/10 bg-[#1a1c22] shadow-[0_24px_70px_-35px_rgba(26,28,34,.5)]">
                      <Image
                        src={prints.leads.src}
                        width={prints.leads.largura}
                        height={prints.leads.altura}
                        alt="Cards de leads com nota, avaliações do Google, etiquetas e o que o Agente descobriu sobre cada empresa"
                        className="h-auto w-full"
                        sizes="(max-width: 768px) 100vw, 500px"
                      />
                    </div>
                    <figcaption className="mt-3 text-sm text-[#5f6672]">
                      <b className="text-[#1a1c22]">Cada lead com tudo à vista</b> — nota, avaliações
                      do Google, etiquetas 🔥 quente / ❄️ frio, e o que o Agente descobriu: tem site?
                      tem WhatsApp? costuma pagar por isso?
                    </figcaption>
                  </figure>
                )}
              </div>
            )}
          </section>
        )}

        {/* ============================ A DOR ============================== */}
        <section className="px-5 py-16">
          <div className="pv-rev mx-auto max-w-3xl text-center">
            <span className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#EA4335]">
              O problema
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              Você deveria gastar seu tempo vendendo,{" "}
              <span className="text-[#EA4335]">não procurando telefone</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#5f6672]">
              Hoje você abre o Google, pesquisa empresa por empresa, copia contatos, escreve
              mensagens e tenta lembrar quem respondeu. No fim do dia, suas melhores horas foram
              consumidas antes de começar uma conversa de venda.
            </p>
          </div>
          <div className="pv-rev mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-2">
            <div className="rounded-3xl border border-[#EA4335]/20 bg-white p-7">
              <p className="text-sm font-extrabold uppercase tracking-wide text-[#EA4335]">Seu dia, hoje</p>
              <ul className="mt-4 flex flex-col gap-3 text-[15px] leading-relaxed text-[#5f6672]">
                {HOJE.map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <span className="mt-0.5 flex-none font-bold text-[#EA4335]">✕</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-[#34A853]/30 bg-white p-7 shadow-[0_20px_60px_-30px_rgba(52,168,83,.4)]">
              <p className="text-sm font-extrabold uppercase tracking-wide text-[#34A853]">
                Com o Prospector
              </p>
              <ul className="mt-4 flex flex-col gap-3 text-[15px] leading-relaxed text-[#5f6672]">
                {COM_PROSPECTOR.map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <span className="mt-0.5 flex-none font-bold text-[#34A853]">✓</span>
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-5 rounded-2xl bg-[#34A853]/10 px-4 py-3 text-center text-sm font-extrabold text-[#188038]">
                Você entra quando já existe uma conversa para continuar.
              </p>
            </div>
          </div>
        </section>

        {/* ========================= COMO FUNCIONA ========================= */}
        <section className="bg-white px-5 py-20">
          <div className="pv-rev mx-auto max-w-3xl text-center">
            <span className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#4285F4]">
              Como funciona
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              Você escolhe o público.{" "}
              <span className="text-[#4285F4]">O Agente faz o trabalho pesado.</span>
            </h2>
          </div>
          <div className="mx-auto mt-12 flex max-w-3xl flex-col gap-0">
            {PASSOS.map((p, i) => (
              <div key={p.titulo} className="pv-rev relative flex gap-5 sm:gap-7">
                <div className="flex flex-col items-center">
                  <span
                    className="flex h-11 w-11 flex-none items-center justify-center rounded-full font-display text-lg font-extrabold text-white shadow-lg"
                    style={{ background: p.cor }}
                  >
                    {i + 1}
                  </span>
                  {i < PASSOS.length - 1 && (
                    <span className="w-0.5 flex-1 bg-gradient-to-b from-black/15 to-black/5" />
                  )}
                </div>
                <div className={i < PASSOS.length - 1 ? "pb-10" : ""}>
                  <h3 className="text-xl font-extrabold tracking-tight">{p.titulo}</h3>
                  <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-[#5f6672]">{p.texto}</p>
                  <div className="mt-3 max-w-md">{p.visual}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="pv-rev mt-10 text-center">
            <Link
              data-track="Passos · Configurar busca"
              href="#preco"
              className="inline-block rounded-full bg-[#25D366] px-7 py-3 text-base font-bold text-white shadow-[0_12px_32px_-10px_rgba(37,211,102,.8)] transition hover:-translate-y-0.5 hover:brightness-105"
            >
              Quero configurar minha primeira busca →
            </Link>
          </p>
        </section>

        {/* ===================== NÃO É LISTA, É FLUXO ====================== */}
        <section className="relative overflow-hidden bg-[#1a1c22] px-5 py-20 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "42px 42px",
            }}
          />
          <div className="pv-rev relative mx-auto max-w-3xl text-center">
            <span className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#8ab4f8]">
              A diferença para um disparador
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              Não é apenas uma lista.{" "}
              <span className="text-[#25D366]">É um fluxo de prospecção.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">
              Uma lista entrega contatos e deixa o resto com você. O Prospector encontra, organiza,
              monta a abordagem, envia pelo seu WhatsApp e mostra quem respondeu.
            </p>
            <div className="mt-8 flex justify-center">
              <Robo estado="trabalhando" tamanho={110} cor="#4285F4" corClara="#8ab4f8" />
            </div>
            <p className="mt-2 text-sm font-bold text-[#25D366]">● trabalhando agora</p>
          </div>

          <div className="pv-rev relative mx-auto mt-12 grid max-w-4xl gap-5 sm:grid-cols-2">
            {FLUXO.map((c) => (
              <div key={c.titulo} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <span className="text-2xl">{c.emoji}</span>
                <h3 className="mt-2 text-lg font-extrabold tracking-tight">{c.titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">{c.texto}</p>
              </div>
            ))}
          </div>

          {/*
            Honestidade sobre o WhatsApp, em uma linha e sem drama. Prometer
            "número seguro" é o que ninguém pode prometer — e o cliente que
            descobre isso na prática vira reembolso e denúncia.
          */}
          <p className="pv-rev relative mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-white/45">
            Use a ferramenta de forma responsável e de acordo com as regras do WhatsApp. Controles de
            volume, pausas, personalização e opt-out ajudam a prospectar com responsabilidade —
            nenhuma automação elimina completamente o risco de restrições.
          </p>
        </section>

        {/* ========================== O PAINEL ============================= */}
        <section className="px-5 py-20">
          <div className="pv-rev mx-auto max-w-3xl text-center">
            <span className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#34A853]">
              O resultado no painel
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              Abra o painel e saiba{" "}
              <span className="text-[#25D366]">exatamente com quem falar</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#5f6672]">
              Veja quem respondeu, quem perguntou preço, quem pediu proposta e quem precisa de
              acompanhamento — e marque cada um com a etiqueta que fizer sentido para você.
            </p>
          </div>

          <div className="pv-rev mx-auto mt-12 grid max-w-4xl items-start gap-6 md:grid-cols-2">
            {/* o painel */}
            <div className="rounded-3xl border border-black/10 bg-white p-4 shadow-[0_24px_70px_-35px_rgba(26,28,34,.5)]">
              <p className="px-1 pb-2 text-xs font-bold uppercase tracking-wide text-[#5f6672]">
                Seu funil
              </p>
              {[
                { nome: "Clínica Bella Pele", info: "⭐ 4,8 · 132 avaliações", cor: "#34A853", tag: "🔥 Lead quente", resp: "“Pode mandar sim!”" },
                { nome: "Advocacia Prado & Silva", info: "⭐ 4,9 · 51 avaliações", cor: "#4285F4", tag: "📄 Proposta enviada", resp: "“Manda o valor”" },
                { nome: "Academia Corpo Livre", info: "⭐ 4,6 · 210 avaliações", cor: "#FBBC05", tag: "📞 Ligar na sexta", resp: null },
              ].map((l) => (
                <div
                  key={l.nome}
                  className="mb-2 rounded-2xl border border-black/5 bg-[#f7f9fe] p-3"
                  style={{ borderLeft: `4px solid ${l.cor}` }}
                >
                  <p className="text-sm font-bold">{l.nome}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-[#5f6672]">{l.info}</span>
                    <span className="rounded-full bg-[#FBBC05]/20 px-2 py-0.5 font-bold text-[#8a6d00]">{l.tag}</span>
                    {l.resp && (
                      <span className="rounded-full bg-[#25D366]/15 px-2 py-0.5 font-bold text-[#128C4A]">
                        respondeu: {l.resp}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {ETIQUETAS.map((e) => (
                  <span key={e} className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-bold text-[#3c4048]">
                    {e}
                  </span>
                ))}
              </div>
            </div>

            {/* a conversa */}
            <div className="rounded-3xl border border-black/10 bg-[#e5ddd5] p-4 shadow-[0_24px_70px_-35px_rgba(26,28,34,.5)]">
              <p className="pb-2 text-xs font-bold uppercase tracking-wide text-[#5f6672]">
                O WhatsApp do lead
              </p>
              <div className="flex flex-col gap-2">
                <div className="max-w-[88%] self-end rounded-2xl rounded-tr-sm bg-[#d9fdd3] p-3 text-[13px] leading-relaxed text-[#1a1c22] shadow-sm">
                  Oi! Encontrei a <b>Clínica Bella Pele</b> pesquisando clínicas no Cambuí e vi que
                  vocês têm <b>132 avaliações</b>. Eu trabalho com <b>plano de saúde empresarial</b> e
                  atendo clínicas da região. Posso te mandar um resumo rápido de como funciona, sem
                  compromisso?
                  <span className="mt-1 block text-right text-[10px] text-[#5f6672]">09:42 ✓✓</span>
                </div>
                <div className="max-w-[70%] self-start rounded-2xl rounded-tl-sm bg-white p-3 text-[13px] text-[#1a1c22] shadow-sm">
                  Pode mandar sim! 👍
                  <span className="mt-1 block text-right text-[10px] text-[#5f6672]">11:07</span>
                </div>
                <div className="max-w-[40%] self-start rounded-2xl rounded-tl-sm bg-white px-3 py-2.5 shadow-sm">
                  <span className="pv-dots"><span /><span /><span /></span>
                </div>
              </div>
              <p className="mt-3 rounded-xl bg-white/70 p-2.5 text-center text-[11px] font-semibold text-[#5f6672]">
                Daqui em diante é com você — o lead já chegou aquecido.
              </p>
            </div>
          </div>

          <p className="pv-rev mx-auto mt-8 max-w-2xl text-center text-sm text-[#5f6672]">
            A lista não fica presa no sistema: exporte para Excel ou Google Sheets quando quiser —
            tudo, só os contatos, ou só os números de WhatsApp.
          </p>
        </section>

        {/* ========================= MARQUEE NICHOS ======================== */}
        <section className="overflow-hidden bg-white py-14">
          <div className="pv-rev mx-auto max-w-3xl px-5 text-center">
            <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-4xl">
              Se o negócio está no Google Maps,{" "}
              <span className="text-[#4285F4]">o Prospector encontra.</span>
            </h2>
            <p className="mt-3 text-[#5f6672]">
              Mais de 90 categorias prontas — e qualquer outra digitada à mão.
            </p>
          </div>
          <div className="relative mt-8">
            <div className="pv-marquee flex w-max gap-3">
              {[...NICHOS_MARQUEE, ...NICHOS_MARQUEE].map((n, i) => (
                <span
                  key={i}
                  className="flex-none rounded-full border border-black/10 bg-[#f7f9fe] px-4 py-2 text-sm font-semibold text-[#3c4048]"
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ============================ OFERTA ============================= */}
        <section id="preco" className="px-5 py-20">
          <div className="pv-rev mx-auto max-w-3xl text-center">
            <span className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#4285F4]">
              A oferta
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              Todo o seu processo de prospecção{" "}
              <span className="text-[#34A853]">por R$ {preco} por mês</span>
            </h2>
          </div>

          <div className="pv-rev mx-auto mt-10 max-w-lg">
            <div className="rounded-[2rem] bg-gradient-to-br from-[#4285F4] via-[#EA4335] to-[#34A853] p-[3px] shadow-[0_36px_90px_-35px_rgba(66,133,244,.55)]">
              <div className="rounded-[calc(2rem-3px)] bg-white p-8 text-center sm:p-10">
                <span className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#4285F4]">
                  Um plano. Tudo dentro.
                </span>
                <p className="mt-4 font-display text-6xl font-extrabold tracking-tight">
                  R$ {preco}
                  <span className="text-xl font-bold text-[#5f6672]">/mês</span>
                </p>
                <p className="mt-2 text-sm font-semibold text-[#5f6672]">
                  Menos de R$ 3,30 por dia — e trabalha todos eles.
                </p>
                <ul className="mx-auto mt-6 flex max-w-sm flex-col gap-2.5 text-left text-[15px] text-[#3c4048]">
                  {[
                    "Buscas ilimitadas no Google Maps, com filtros",
                    "Empresas organizadas no painel, com telefone e avaliações",
                    "Mensagem com o nome de cada empresa, variando a cada envio",
                    "Envio automático pelo seu WhatsApp, no ritmo de uma pessoa",
                    "Remarketing automático em até 3 toques",
                    "CRM com funil, etiquetas e lembretes",
                    "Exportação em planilha (só WhatsApp, contatos ou tudo)",
                    "Modelos de abordagem prontos por tipo de venda",
                    "Sem cobrança por lead ou por mensagem",
                  ].map((t) => (
                    <li key={t} className="flex gap-2.5">
                      <span className="mt-0.5 flex-none font-bold text-[#34A853]">✓</span>
                      {t}
                    </li>
                  ))}
                </ul>
                <Link
                  data-track="Preço · Assinar"
                  href="/assinar/prospector"
                  className="mt-8 block rounded-full bg-[#25D366] px-8 py-4 text-lg font-bold text-white shadow-[0_14px_36px_-10px_rgba(37,211,102,.8)] transition hover:-translate-y-0.5 hover:brightness-105"
                >
                  Quero começar a prospectar →
                </Link>
                <p className="mt-3 text-xs text-[#5f6672]">
                  Sem fidelidade · cancele direto pelo painel · pagamento seguro
                </p>
              </div>
            </div>

            {/* comparação: o que isso custaria separado */}
            <div className="pv-rev mt-6 overflow-hidden rounded-3xl border border-black/10 bg-white">
              {[
                { i: "🔎", t: "Lista da sua região, sempre atualizada", v: "lista comprada: R$ 200 e envelhece no dia" },
                { i: "🤖", t: "Agente que monta e envia por você", v: "estagiário para isso: R$ 1.400/mês" },
                { i: "🔁", t: "Remarketing em até 3 toques", v: "ferramenta de cadência: R$ 150/mês" },
                { i: "🗂️", t: "CRM com funil e etiquetas", v: "CRM de mercado: R$ 90/mês" },
              ].map((l) => (
                <div key={l.t} className="flex flex-wrap items-center gap-3 border-b border-black/5 px-5 py-3.5 text-sm last:border-0">
                  <span className="text-xl">{l.i}</span>
                  <span className="flex-1 font-bold">{l.t}</span>
                  <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-bold text-[#5f6672]">{l.v}</span>
                </div>
              ))}
              <div className="bg-[#1a1c22] p-5 text-center text-white">
                <p className="text-sm text-white/60">
                  Separado: <s className="text-white/50">mais de R$ 1.800 por mês</s>
                </p>
                <p className="mt-1 font-display text-2xl font-extrabold">
                  Aqui: <span className="text-[#34A853]">R$ {preco}/mês</span>, tudo junto
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================== GARANTIA ============================= */}
        <section className="px-5 pb-20">
          <div className="pv-rev mx-auto max-w-lg rounded-3xl border-2 border-dashed border-[#34A853]/50 bg-[#34A853]/[0.06] p-8 text-center">
            <span className="text-4xl">🛡️</span>
            <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              Teste durante sete dias
            </h2>
            {/*
              Verificável de propósito: a promessa é sobre o que o sistema
              ENTREGA (empresas com telefone), não sobre quanto o cliente vai
              vender, que não depende de nós.
            */}
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-[#3c4048]">
              Se o Prospector não encontrar{" "}
              <b>pelo menos 100 empresas do seu ramo e da sua região, com telefone</b>, nos
              primeiros sete dias, peça o reembolso pelo WhatsApp do suporte. Você recebe{" "}
              <b>100% do valor</b> de volta. Sem formulário complicado, sem fidelidade.
            </p>
            <Link
              data-track="Garantia · Testar"
              href="/assinar/prospector"
              className="mt-6 inline-block rounded-full bg-[#34A853] px-7 py-3 text-base font-bold text-white shadow-[0_12px_32px_-10px_rgba(52,168,83,.8)] transition hover:-translate-y-0.5 hover:brightness-105"
            >
              Quero testar o Prospector →
            </Link>
          </div>
        </section>

        {/* ====================== PARA QUEM É / NÃO É ====================== */}
        <section className="px-5 pb-20">
          <div className="pv-rev mx-auto max-w-3xl rounded-3xl border border-black/10 bg-white p-7">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="font-display text-lg font-extrabold tracking-tight text-[#188038]">
                  O Prospector é para você se…
                </p>
                <ul className="mt-3 flex flex-col gap-2 text-[15px] text-[#5f6672]">
                  {[
                    "Você vende produtos ou serviços para empresas",
                    "Seu atendimento acontece pelo WhatsApp",
                    "Uma venda nova vale mais que a mensalidade",
                    "Você consegue responder quem demonstrar interesse",
                    "Você quer depender menos de indicação",
                  ].map((t) => (
                    <li key={t} className="flex gap-2">
                      <span className="mt-0.5 flex-none font-bold text-[#34A853]">✓</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-display text-lg font-extrabold tracking-tight text-[#EA4335]">
                  Não é para você se…
                </p>
                <ul className="mt-3 flex flex-col gap-2 text-[15px] text-[#5f6672]">
                  {[
                    "Você espera que a ferramenta feche a venda sozinha",
                    "Você pretende enviar centenas de mensagens sem controle",
                    "Você não vai responder quem demonstrar interesse",
                    "Você procura uma lista de consumidores pessoa física",
                  ].map((t) => (
                    <li key={t} className="flex gap-2">
                      <span className="mt-0.5 flex-none font-bold text-[#EA4335]">✕</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ============================= FAQ =============================== */}
        <section className="bg-white px-5 py-20">
          <div className="pv-rev mx-auto max-w-3xl">
            <h2 className="text-center font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Dúvidas frequentes
            </h2>
            <div className="mt-8 flex flex-col gap-3">
              {PERGUNTAS.map((q) => (
                <details key={q.p} className="group rounded-2xl border border-black/10 bg-[#f7f9fe] p-5 open:bg-white open:shadow-md">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold [&::-webkit-details-marker]:hidden">
                    {q.p}
                    <span className="flex-none text-[#4285F4] transition group-open:rotate-45">＋</span>
                  </summary>
                  <p className="mt-3 text-[15px] leading-relaxed text-[#5f6672]">{q.r}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ========================== CTA FINAL ============================ */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#4285F4] to-[#34A853] px-5 py-24 text-center text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-15"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "42px 42px",
            }}
          />
          <div className="pv-rev relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              Sua próxima conversa de venda pode começar hoje
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">
              Conecte o WhatsApp, escolha o ramo e a região e deixe o Agente fazer o trabalho pesado.
              Você acompanha pelo painel e entra quando surgir uma oportunidade.
            </p>
            <Link
              data-track="Rodapé · Assinar"
              href="/assinar/prospector"
              className="mt-8 inline-block rounded-full bg-white px-9 py-4 text-lg font-extrabold text-[#1a1c22] shadow-2xl transition hover:-translate-y-0.5"
            >
              Começar por R$ {preco}/mês →
            </Link>
            <p className="mt-3 text-sm font-bold text-white">
              🛡️ 7 dias de garantia · sem fidelidade · cancele quando quiser
            </p>
          </div>
        </section>
      </main>

      <footer className="bg-[#1a1c22] px-5 py-8 text-center text-xs text-white/50">
        <p>Prospector · prospecção de clientes no Google Maps e WhatsApp</p>
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href="/termos" className="underline hover:text-white/80">Termos de uso</Link>
          <Link href="/privacidade" className="underline hover:text-white/80">Privacidade</Link>
          {suporte && (
            <a
              href={`https://wa.me/${suporte}`}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-white/80"
            >
              Suporte no WhatsApp
            </a>
          )}
          <Link href="/" className="underline hover:text-white/80">um produto PáginaPro</Link>
        </p>
      </footer>

      {/*
        Botão fixo no celular. Metade das visitas de anúncio vem do celular,
        onde o botão do preço fica quatro telas abaixo — e a pessoa decide no
        meio da leitura. Discreto, some no desktop.
      */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 p-3 backdrop-blur md:hidden">
        <Link
          data-track="Fixo · Começar"
          href="#preco"
          className="block rounded-full bg-[#25D366] py-3 text-center text-sm font-bold text-white shadow-lg"
        >
          Começar por R$ {preco}/mês →
        </Link>
      </div>
    </div>
  );
}
