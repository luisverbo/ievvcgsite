import Link from "next/link";
import { precoEmReais } from "@/lib/pagamentos/planos";

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
 * Efeitos 100% CSS (pins caindo, radar, marquee, digitação, barras): nada de
 * biblioteca, nada de JS — a página de anúncio precisa abrir instantânea no
 * 4G, e cada kb aqui é taxa de conversão. O reveal por rolagem usa
 * animation-timeline com @supports: navegador antigo vê tudo parado e
 * perfeito, navegador novo vê a página acender bloco a bloco.
 */

export const revalidate = 3600;

export const metadata = {
  title: "Prospector — o Google sabe quem é seu próximo cliente",
  description:
    "Encontre empresas da sua região no Google Maps e aborde cada uma no WhatsApp com a sua mensagem, no ritmo de uma pessoa. Para corretores, representantes e vendedores B2B. Sem cobrança por lead.",
};

/* ------------------------------ dados da página --------------------------- */

const DIA_SEM = [
  "Caçar empresa por empresa no Google, copiando telefone no caderno",
  "Mandar a mesma mensagem colada 40 vezes — e torcer para o WhatsApp não bloquear",
  "Esquecer quem você já chamou e chamar de novo",
  "Perder o lead que respondeu terça porque a conversa afundou",
  "Terminar o dia sem saber quantos contatos viraram conversa",
];

const DIA_COM = [
  "Você digita o ramo e o bairro — a lista nasce sozinha, com telefone e avaliações",
  "Cada empresa recebe a SUA mensagem com o nome dela, o bairro, as avaliações",
  "O envio sai no ritmo de uma pessoa: limite diário e pausa entre mensagens",
  "Quem não responde recebe de novo no dia que você escolher — uma vez, com educação",
  "O funil mostra quem respondeu, o que disse e quem você marcou de 🔥 quente",
];

const PASSOS: { cor: string; titulo: string; texto: string; visual: React.ReactNode }[] = [
  {
    cor: "#4285F4",
    titulo: "Diga o que procura",
    texto:
      "“Clínicas de estética em Campinas”. “Advocacia na Barra”. Mais de 90 categorias prontas — ou digite qualquer ramo. O assistente varre o Google Maps e traz nome, WhatsApp, avaliações e endereço.",
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
    titulo: "Escreva sua mensagem uma vez",
    texto:
      "O texto é seu e vende o SEU produto. As variáveis preenchem sozinhas em cada envio — e as variações de frase fazem cada mensagem sair diferente, que é o que não parece robô.",
    visual: (
      <div className="rounded-xl border border-black/10 bg-white p-3 text-left text-xs leading-relaxed text-[#5f6672] shadow-sm">
        Oi! Achei a <span className="rounded bg-[#4285F4]/10 px-1 font-bold text-[#4285F4]">{"{empresa}"}</span>{" "}
        aqui em <span className="rounded bg-[#34A853]/10 px-1 font-bold text-[#34A853]">{"{bairro}"}</span> e vi
        que vocês têm <span className="rounded bg-[#FBBC05]/20 px-1 font-bold text-[#b8860b]">{"{avaliacoes}"}</span>{" "}
        avaliações…
      </div>
    ),
  },
  {
    cor: "#FBBC05",
    titulo: "O envio sai no ritmo de gente",
    texto:
      "Limite por dia, intervalo aleatório entre uma mensagem e outra, texto sempre variando. São as proteções que mantêm o seu número saudável — e já vêm ligadas.",
    visual: (
      <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-white p-3 shadow-sm">
        <span className="text-lg">⏱️</span>
        <div className="flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-black/10">
            <div className="pv-barra h-full rounded-full bg-[#FBBC05]" style={{ width: "62%" }} />
          </div>
          <p className="mt-1 text-[11px] text-[#5f6672]">13 de 20 enviadas hoje · próxima em 1min 40s</p>
        </div>
      </div>
    ),
  },
  {
    cor: "#34A853",
    titulo: "Quem não respondeu, recebe de novo",
    texto:
      "A maioria dos leads não diz “não” — só esquece. O remarketing manda a segunda mensagem depois dos dias que você escolher. Uma vez só, com saída fácil. E quem pede para sair, sai para sempre.",
    visual: (
      <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-white p-3 text-xs text-[#5f6672] shadow-sm">
        <span className="text-lg">🔁</span>
        <span>
          4 dias sem resposta → <b className="text-[#34A853]">segunda mensagem enviada</b>
        </span>
      </div>
    ),
  },
];

const NICHOS_MARQUEE = [
  "🦷 Dentistas", "⚖️ Advocacia", "💇 Salões", "💪 Academias", "🏥 Clínicas",
  "🚗 Oficinas", "🍕 Pizzarias", "💊 Farmácias", "🏨 Pousadas", "📐 Arquitetos",
  "✂️ Barbearias", "🐾 Pet shops", "🏠 Imobiliárias", "💅 Esmalterias", "📚 Escolas",
  "🔧 Autopeças", "🌸 Floriculturas", "👓 Óticas", "🧾 Contadores", "🍰 Confeitarias",
  "🧱 Mat. construção", "🥩 Açougues", "📷 Fotógrafos", "🎉 Buffets",
];

const PROTECOES = [
  {
    emoji: "🎭",
    titulo: "Nenhuma mensagem igual à outra",
    texto: "Variações de frase sorteadas a cada envio. Mensagem repetida é o sinal nº 1 de disparo — aqui ela não existe.",
  },
  {
    emoji: "⏳",
    titulo: "Ritmo de pessoa, não de robô",
    texto: "Pausa aleatória entre mensagens e teto diário que você controla. Começa com 15 por dia e cresce com segurança.",
  },
  {
    emoji: "🚫",
    titulo: "Opt-out sagrado",
    texto: "Escreveu “não quero”? Sai de todas as filas na hora, para sempre. É o que separa prospecção de spam — e protege seu número de denúncia.",
  },
  {
    emoji: "🔒",
    titulo: "Seu número, sua máquina",
    texto: "O assistente roda no SEU computador, com o SEU WhatsApp. Nada de número alugado, nada de conta emprestada.",
  },
];

const PERGUNTAS = [
  {
    p: "Preciso entender de tecnologia?",
    r: "Não. Você baixa o assistente no seu computador (o painel te guia passo a passo), escaneia o QR do WhatsApp uma vez e pronto. O resto é apertar botão.",
  },
  {
    p: "Tem cobrança por lead ou por mensagem?",
    r: "Nenhuma. A mensalidade é tudo que você paga. Busque e aborde quantas empresas quiser, dentro do ritmo seguro do WhatsApp.",
  },
  {
    p: "Meu número corre risco?",
    r: "O sistema inteiro foi desenhado para protegê-lo: mensagens sempre diferentes, intervalo aleatório, limite diário, opt-out automático. Ainda assim, recomendamos começar devagar — e de preferência com um chip dedicado à prospecção.",
  },
  {
    p: "A mensagem oferece o quê?",
    r: "O que VOCÊ vende. Você diz em uma linha (“plano de saúde empresarial”, “consórcio de imóveis”) e o texto pronto já sai falando disso — e dá para ajustar cada palavra.",
  },
  {
    p: "De onde vêm os contatos?",
    r: "Do Google Maps, que é público. O assistente pesquisa como uma pessoa pesquisaria e organiza tudo: nome, telefone, avaliações, endereço, site. Empresa sem celular não entra na fila do WhatsApp.",
  },
  {
    p: "E se eu quiser cancelar?",
    r: "Dois cliques, dentro do painel, sem falar com ninguém. Sem fidelidade, sem multa, sem retenção forçada.",
  },
];

/* --------------------------------- página --------------------------------- */

export default function ProspectorPage() {
  const preco = precoEmReais("prospector");
  return (
    <div className="pv min-h-screen overflow-x-hidden bg-[#f7f9fe] text-[#1a1c22]">
      {/* Os efeitos da página, todos em CSS. Prefixo pv- para não vazar. */}
      <style>{`
        .pv { --g-azul:#4285F4; --g-verm:#EA4335; --g-amar:#FBBC05; --g-verde:#34A853; --wa:#25D366; }

        @keyframes pv-cair { 0% { transform: translateY(-46px) scale(.6); opacity: 0; } 60% { transform: translateY(4px) scale(1.05); opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
        .pv-pin { animation: pv-cair .7s cubic-bezier(.2,.9,.3,1.2) both; }

        @keyframes pv-radar { 0% { transform: scale(.4); opacity: .55; } 100% { transform: scale(2.6); opacity: 0; } }
        .pv-radar { animation: pv-radar 2.6s ease-out infinite; }

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
        Feito para corretores, representantes e vendedores B2B · sem fidelidade
      </div>

      {/* cabeçalho enxuto: uma página, uma promessa, um botão */}
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
            <Link href="/login" className="text-sm font-semibold text-[#5f6672] transition hover:text-[#1a1c22]">
              Entrar
            </Link>
            <Link
              href="/assinar/prospector"
              className="rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_-8px_rgba(37,211,102,.7)] transition hover:-translate-y-0.5 hover:brightness-105"
            >
              Começar agora
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ============================== HERO ============================== */}
        <section className="relative px-5 pb-20 pt-16 sm:pt-24">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
                O Google sabe quem é{" "}
                <span className="bg-gradient-to-r from-[#4285F4] via-[#EA4335] to-[#34A853] bg-clip-text text-transparent">
                  seu próximo cliente.
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#5f6672]">
                O Prospector encontra as empresas da sua região no Google Maps e manda a{" "}
                <b className="text-[#1a1c22]">sua mensagem</b> no WhatsApp de cada uma — no ritmo
                de uma pessoa, enquanto você atende quem já respondeu.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/assinar/prospector"
                  className="rounded-full bg-[#25D366] px-8 py-4 text-base font-bold text-white shadow-[0_14px_36px_-10px_rgba(37,211,102,.8)] transition hover:-translate-y-0.5 hover:brightness-105 sm:text-lg"
                >
                  Quero minha lista de clientes →
                </Link>
              </div>
              <p className="mt-3 text-sm text-[#5f6672]">
                R$ {preco}/mês · sem cobrança por lead · cancele quando quiser
              </p>
            </div>

            {/* o mapa vivo: pins caindo + radar + card de lead flutuando */}
            <div className="relative mx-auto w-full max-w-md">
              <div
                className="relative h-80 overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_30px_80px_-30px_rgba(66,133,244,.35)]"
                style={{
                  backgroundImage:
                    "linear-gradient(#eef2fb 1px, transparent 1px), linear-gradient(90deg, #eef2fb 1px, transparent 1px)",
                  backgroundSize: "34px 34px",
                }}
              >
                {/* "ruas" */}
                <div className="absolute left-0 top-1/3 h-3 w-full -rotate-6 bg-[#f7d879]/40" />
                <div className="absolute left-1/4 top-0 h-full w-3 rotate-12 bg-[#a8c7fa]/40" />
                {/* radar no centro */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="pv-radar absolute -inset-6 rounded-full border-2 border-[#4285F4]/50" />
                  <div className="pv-radar absolute -inset-6 rounded-full border-2 border-[#4285F4]/50" style={{ animationDelay: "1.3s" }} />
                  <div className="relative h-4 w-4 rounded-full bg-[#4285F4] ring-4 ring-white" />
                </div>
                {/* pins caindo */}
                {[
                  { top: "18%", left: "22%", cor: "#EA4335", d: ".2s" },
                  { top: "30%", left: "68%", cor: "#34A853", d: ".55s" },
                  { top: "62%", left: "30%", cor: "#FBBC05", d: ".9s" },
                  { top: "70%", left: "74%", cor: "#EA4335", d: "1.25s" },
                  { top: "44%", left: "84%", cor: "#4285F4", d: "1.6s" },
                  { top: "80%", left: "52%", cor: "#34A853", d: "1.95s" },
                ].map((p, i) => (
                  <div key={i} className="pv-pin absolute" style={{ top: p.top, left: p.left, animationDelay: p.d }}>
                    <svg width="26" height="34" viewBox="0 0 24 32">
                      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill={p.cor} />
                      <circle cx="12" cy="12" r="4.5" fill="#fff" />
                    </svg>
                  </div>
                ))}
              </div>

              {/* card de lead flutuando por cima */}
              <div className="pv-flutua absolute -bottom-8 -left-4 w-64 rounded-2xl border border-black/10 bg-white p-3.5 shadow-xl sm:-left-10">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">Clínica Bella Pele</p>
                  <span className="rounded-full bg-[#FBBC05]/20 px-2 py-0.5 text-[11px] font-bold text-[#b8860b]">
                    nota 87
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[#5f6672]">⭐ 4,8 · 132 avaliações · Cambuí</p>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold">
                  <span className="rounded-full bg-[#25D366]/15 px-2 py-0.5 text-[#128C4A]">WhatsApp ✓</span>
                  <span className="rounded-full bg-[#EA4335]/10 px-2 py-0.5 text-[#EA4335]">🔥 quente</span>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-20 text-center text-sm font-semibold text-[#5f6672]">
            ↓ Veja o que muda no seu dia
          </p>
        </section>

        {/* ============================ A DOR ============================== */}
        <section className="px-5 py-16">
          <div className="pv-rev mx-auto max-w-3xl text-center">
            <span className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#EA4335]">
              A conta que ninguém faz
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              Prospectar na mão custa as suas{" "}
              <span className="text-[#EA4335]">melhores horas de venda</span>
            </h2>
          </div>
          <div className="pv-rev mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-2">
            <div className="rounded-3xl border border-[#EA4335]/20 bg-white p-7">
              <p className="text-sm font-extrabold uppercase tracking-wide text-[#EA4335]">Seu dia, hoje</p>
              <ul className="mt-4 flex flex-col gap-3 text-[15px] leading-relaxed text-[#5f6672]">
                {DIA_SEM.map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <span className="mt-0.5 flex-none font-bold text-[#EA4335]">✕</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-[#34A853]/30 bg-white p-7 shadow-[0_20px_60px_-30px_rgba(52,168,83,.4)]">
              <p className="text-sm font-extrabold uppercase tracking-wide text-[#34A853]">
                Seu dia, com o Prospector
              </p>
              <ul className="mt-4 flex flex-col gap-3 text-[15px] leading-relaxed text-[#5f6672]">
                {DIA_COM.map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <span className="mt-0.5 flex-none font-bold text-[#34A853]">✓</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="pv-rev mt-12 text-center text-sm font-semibold text-[#5f6672]">
            A diferença não é esforço — é sistema. Veja como ele trabalha ↓
          </p>
        </section>

        {/* ========================= COMO FUNCIONA ========================= */}
        <section className="bg-white px-5 py-20">
          <div className="pv-rev mx-auto max-w-3xl text-center">
            <span className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#4285F4]">
              Como funciona
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              Quatro passos. Você só faz o primeiro.
            </h2>
          </div>
          <div className="mx-auto mt-12 flex max-w-3xl flex-col gap-0">
            {PASSOS.map((p, i) => (
              <div key={p.titulo} className="pv-rev relative flex gap-5 sm:gap-7">
                {/* trilho que liga um passo ao outro */}
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
        </section>

        {/* ===================== DEMO: PAINEL + WHATSAPP =================== */}
        <section className="px-5 py-20">
          <div className="pv-rev mx-auto max-w-3xl text-center">
            <span className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#34A853]">
              O resultado na tela
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              De um lado, seu funil.{" "}
              <span className="text-[#25D366]">Do outro, a conversa.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#5f6672]">
              Cada lead com nota, avaliações e etiqueta sua — 🔥 quente, ❄️ frio, “ligar sexta”.
              E a resposta de cada um à vista, para você entrar na conversa na hora certa.
            </p>
          </div>

          <div className="pv-rev mx-auto mt-12 grid max-w-4xl items-start gap-6 md:grid-cols-2">
            {/* mock do painel */}
            <div className="rounded-3xl border border-black/10 bg-white p-4 shadow-[0_24px_70px_-35px_rgba(26,28,34,.5)]">
              <p className="px-1 pb-2 text-xs font-bold uppercase tracking-wide text-[#5f6672]">
                Seu painel
              </p>
              {[
                { nome: "Clínica Bella Pele", info: "⭐ 4,8 · 132 avaliações", nota: 87, cor: "#34A853", tag: "🔥 quente", resp: "“Pode mandar sim!”" },
                { nome: "Advocacia Prado & Silva", info: "⭐ 4,9 · 51 avaliações", nota: 82, cor: "#34A853", tag: "📞 ligar sexta", resp: null },
                { nome: "Academia Corpo Livre", info: "⭐ 4,6 · 210 avaliações", nota: 74, cor: "#FBBC05", tag: null, resp: null },
              ].map((l) => (
                <div key={l.nome} className="mb-2 rounded-2xl border border-black/5 bg-[#f7f9fe] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold">{l.nome}</p>
                    <span className="font-display text-lg font-extrabold" style={{ color: l.cor }}>
                      {l.nota}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/10">
                    <div className="pv-barra h-full rounded-full" style={{ width: `${l.nota}%`, background: l.cor }} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-[#5f6672]">{l.info}</span>
                    {l.tag && (
                      <span className="rounded-full bg-[#FBBC05]/20 px-2 py-0.5 font-bold text-[#8a6d00]">{l.tag}</span>
                    )}
                    {l.resp && (
                      <span className="rounded-full bg-[#25D366]/15 px-2 py-0.5 font-bold text-[#128C4A]">
                        respondeu: {l.resp}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* mock da conversa */}
            <div className="rounded-3xl border border-black/10 bg-[#e5ddd5] p-4 shadow-[0_24px_70px_-35px_rgba(26,28,34,.5)]">
              <p className="pb-2 text-xs font-bold uppercase tracking-wide text-[#5f6672]">
                O WhatsApp do lead
              </p>
              <div className="flex flex-col gap-2">
                <div className="max-w-[88%] self-end rounded-2xl rounded-tr-sm bg-[#d9fdd3] p-3 text-[13px] leading-relaxed text-[#1a1c22] shadow-sm">
                  Oi, Dra. Camila! Achei a <b>Clínica Bella Pele</b> aqui no Cambuí e vi que vocês
                  têm <b>132 avaliações</b> — sinal de que o trabalho é muito bem falado. Eu
                  trabalho com <b>plano de saúde empresarial</b> e atendo clínicas da região.
                  Posso te mandar um resumo rápido de como funciona, sem compromisso?
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

        {/* ========================== PROTEÇÕES ============================ */}
        <section className="px-5 py-20">
          <div className="pv-rev mx-auto max-w-3xl text-center">
            <span className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#4285F4]">
              A pergunta certa
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              “E o meu número, corre risco?”
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#5f6672]">
              Ferramenta de disparo queima o número porque se comporta como robô. O Prospector foi
              desenhado para se comportar como <b className="text-[#1a1c22]">a sua melhor versão
              organizada</b> — e essas quatro proteções já vêm ligadas:
            </p>
          </div>
          <div className="pv-rev mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-2">
            {PROTECOES.map((p) => (
              <div key={p.titulo} className="rounded-3xl border border-black/10 bg-white p-6">
                <span className="text-2xl">{p.emoji}</span>
                <h3 className="mt-2 text-lg font-extrabold tracking-tight">{p.titulo}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-[#5f6672]">{p.texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============================ PREÇO ============================== */}
        <section id="preco" className="px-5 py-20">
          <div className="pv-rev mx-auto max-w-lg">
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
                  Menos que um almoço com cliente — e trabalha o mês inteiro.
                </p>
                <ul className="mx-auto mt-6 flex max-w-sm flex-col gap-2.5 text-left text-[15px] text-[#3c4048]">
                  {[
                    "Buscas ilimitadas no Google Maps",
                    "Mensagens personalizadas e envio automático",
                    "Remarketing em quem não respondeu",
                    "Funil com etiquetas e respostas à vista",
                    "Sem cobrança por lead. Sem crédito. Sem surpresa.",
                  ].map((t) => (
                    <li key={t} className="flex gap-2.5">
                      <span className="mt-0.5 flex-none font-bold text-[#34A853]">✓</span>
                      {t}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/assinar/prospector"
                  className="mt-8 block rounded-full bg-[#25D366] px-8 py-4 text-lg font-bold text-white shadow-[0_14px_36px_-10px_rgba(37,211,102,.8)] transition hover:-translate-y-0.5 hover:brightness-105"
                >
                  Assinar o Prospector →
                </Link>
                <p className="mt-3 text-xs text-[#5f6672]">
                  Sem fidelidade · cancele em dois cliques, direto no painel
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================= FAQ =============================== */}
        <section className="bg-white px-5 py-20">
          <div className="pv-rev mx-auto max-w-3xl">
            <h2 className="text-center font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Dúvidas diretas
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
              Amanhã de manhã, sua lista está pronta.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">
              Instale hoje, escaneie o QR do seu WhatsApp e diga o ramo e o bairro. O resto,
              você acompanha pelo painel — com o café na mão.
            </p>
            <Link
              href="/assinar/prospector"
              className="mt-8 inline-block rounded-full bg-white px-9 py-4 text-lg font-extrabold text-[#1a1c22] shadow-2xl transition hover:-translate-y-0.5"
            >
              Começar por R$ {preco}/mês →
            </Link>
            <p className="mt-3 text-sm text-white/75">Sem fidelidade. Seu número, sua máquina.</p>
          </div>
        </section>
      </main>

      <footer className="bg-[#1a1c22] px-5 py-8 text-center text-xs text-white/50">
        Prospector · prospecção de clientes no Google Maps e WhatsApp ·{" "}
        <Link href="/" className="underline hover:text-white/80">
          um produto PáginaPro
        </Link>
      </footer>
    </div>
  );
}
