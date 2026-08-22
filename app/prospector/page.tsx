import Link from "next/link";
import { precoEmReais } from "@/lib/pagamentos/planos";

/*
 * A landing do PROSPECTOR — o produto irmão, vendido separado.
 *
 * Público diferente da landing principal: aqui não é a agência que vende
 * site, é o corretor de seguros, o vendedor de plano de saúde, o
 * representante — gente que precisa de LISTA e de ABORDAGEM, não de criador
 * de páginas. A página inteira fala a língua deles e o checkout leva ao
 * plano só de prospecção.
 */

export const revalidate = 3600;

export const metadata = {
  title: "PáginaPro Prospector — encontre clientes no Google Maps e aborde no WhatsApp",
  description:
    "Para quem vende seguro, plano de saúde, consórcio ou representação: encontre empresas da sua região no Google Maps e deixe o assistente abordar no WhatsApp por você, com mensagem personalizada por IA.",
};

const PASSOS = [
  {
    n: "1",
    titulo: "Diga o nicho e a região",
    texto:
      "“Clínicas de estética em Campinas”, “advocacia na Barra”, qualquer ramo — inclusive digitado à mão. O assistente varre o Google Maps e traz nome, telefone, avaliações e endereço de cada empresa.",
  },
  {
    n: "2",
    titulo: "Você escreve a mensagem uma vez",
    texto:
      "O texto é seu e fala do SEU produto. Nele você põe o nome da empresa, o bairro, as avaliações — e o sistema preenche sozinho em cada envio. Dá até para deixar duas ou três versões de cada frase: ele sorteia uma a cada mensagem, e é isso que faz não parecer disparo.",
  },
  {
    n: "3",
    titulo: "O envio respeita ritmo de gente",
    texto:
      "Limite diário, intervalo aleatório entre mensagens e variação de texto — as proteções que evitam bloqueio do WhatsApp já vêm ligadas. Você só conecta o seu número escaneando um QR.",
  },
  {
    n: "4",
    titulo: "Quem não respondeu recebe de novo",
    texto:
      "O remarketing manda uma segunda mensagem depois dos dias que você escolher — uma vez só, com saída fácil no texto. A maioria dos leads não diz “não”: só esquece. E quem pede para não receber sai de todas as filas na hora, para sempre.",
  },
];

const INCLUSO = [
  "Busca ilimitada de empresas no Google Maps (via assistente no seu computador)",
  "Nota de potencial por lead: avaliações, presença digital, poder de compra do ramo",
  "Mensagem personalizada com os dados de cada empresa e variação automática de texto",
  "Envio automático com ritmo humano e limite diário configurável",
  "Remarketing: segunda mensagem em quem não respondeu, no prazo que você definir",
  "Painel do funil: novo, contactado, respondeu, fechou — com a resposta de cada um à vista",
  "Opt-out automático: quem pede para sair some de todas as filas, para sempre",
  "Todas as categorias do Google + busca por ramo digitado à mão",
];

const PARA_QUEM = [
  "Corretores de seguros e de planos de saúde",
  "Vendedores de consórcio e crédito",
  "Representantes comerciais",
  "Contadores e prestadores que atendem empresas",
  "Qualquer vendedor B2B que prospecta negócio local",
];

const PERGUNTAS = [
  {
    p: "Preciso saber de tecnologia?",
    r: "Não. Você instala o assistente no seu computador com um clique (a gente te guia passo a passo), escaneia o QR do WhatsApp e pronto — o resto é apertar botão no painel.",
  },
  {
    p: "Meu número corre risco de bloqueio?",
    r: "O sistema foi desenhado para o contrário: mensagens todas diferentes entre si, intervalo aleatório, limite diário, opt-out respeitado para sempre. É o comportamento de uma pessoa organizada, não de um disparador.",
  },
  {
    p: "A mensagem oferece o quê?",
    r: "O que VOCÊ vende. Você diz em uma linha o que é (“plano de saúde empresarial”, “consórcio de imóveis”) e o texto pronto já sai falando disso — depois é só ajustar as palavras do seu jeito.",
  },
  {
    p: "Tem cobrança por lead ou por mensagem?",
    r: "Nenhuma. A mensalidade é tudo que você paga — não existe crédito para comprar, nem consumo de inteligência artificial por lead. Busque e aborde quantas empresas quiser (dentro do que o WhatsApp aguenta com segurança).",
  },
  {
    p: "De onde vêm os contatos?",
    r: "Do Google Maps, que é público: o assistente pesquisa como uma pessoa pesquisaria e organiza o resultado para você. Empresa sem telefone celular não entra na fila de WhatsApp.",
  },
  {
    p: "Tem fidelidade?",
    r: "Nenhuma. Assinatura mensal, cancela em dois cliques dentro do painel, sem falar com ninguém.",
  },
];

function Botao({
  href,
  children,
  grande = false,
}: {
  href: string;
  children: React.ReactNode;
  grande?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-brand font-bold text-white shadow-[0_10px_40px_-12px_rgba(108,92,231,0.9)] transition duration-200 hover:-translate-y-0.5 hover:bg-brand-2 ${
        grande ? "px-8 py-4 text-base sm:text-lg" : "px-6 py-3 text-sm"
      }`}
    >
      {children}
    </Link>
  );
}

export default function ProspectorPage() {
  const preco = precoEmReais("prospector");
  return (
    <div className="overflow-x-hidden">
      <div className="bg-gradient-to-r from-brand to-brand-2 px-4 py-2.5 text-center text-sm font-semibold text-white">
        🎯 Prospector — a máquina de prospecção do PáginaPro, agora para quem vende qualquer coisa
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="font-display text-xl font-extrabold">
            Página<span className="text-brand-2">Pro</span>
            <span className="ml-2 rounded-md bg-brand/20 px-2 py-0.5 text-xs font-bold text-brand-2">
              Prospector
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden px-3 py-2 text-sm font-semibold text-paper-dim transition hover:text-paper sm:block"
            >
              Entrar
            </Link>
            <Botao href="/assinar/prospector">Assinar</Botao>
          </div>
        </div>
      </header>

      <main>
        {/* hero */}
        <section className="relative isolate overflow-hidden px-5 pb-20 pt-20 sm:pt-28">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[-18rem] -z-10 h-[38rem] w-[70rem] -translate-x-1/2 rounded-full opacity-40 blur-[120px]"
            style={{
              background:
                "radial-gradient(closest-side, #6c5ce7, rgba(142,123,255,0.35), transparent)",
            }}
          />
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl leading-[1.08] sm:text-6xl">
              Você vende. <span className="text-brand-2">Ele prospecta.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-paper-dim sm:text-lg">
              Para quem vende <b className="text-paper">seguro, plano de saúde, consórcio ou
              representação</b>: encontre as empresas da sua região no Google Maps e deixe o
              assistente abordar cada uma no WhatsApp — com a sua mensagem, personalizada com os
              dados de cada empresa, oferecendo <b className="text-paper">o seu produto</b>.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Botao href="/assinar/prospector" grande>
                Começar a prospectar — R$ {preco}/mês
              </Botao>
            </div>
            <p className="mt-3 text-xs text-paper-dim">
              Sem fidelidade · cancele em dois cliques · seu número, seu WhatsApp
            </p>
          </div>
        </section>

        {/* como funciona */}
        <section className="px-5 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-2">
              Como funciona
            </span>
            <h2 className="mt-3 text-3xl leading-[1.1] sm:text-5xl">
              Do “quem eu abordo hoje?” ao lead quente no seu WhatsApp
            </h2>
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-2">
            {PASSOS.map((p) => (
              <div key={p.n} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/20 font-display text-lg font-extrabold text-brand-2">
                  {p.n}
                </span>
                <h3 className="mt-4 text-lg font-bold">{p.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-paper-dim">{p.texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* para quem + incluso */}
        <section className="px-5 py-16">
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7">
              <h3 className="text-xl font-bold">Feito para quem vive de vender</h3>
              <ul className="mt-4 flex flex-col gap-2.5 text-sm text-paper-dim">
                {PARA_QUEM.map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <span className="text-brand-2">→</span>
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-5 rounded-xl border border-white/10 bg-black/25 p-4 text-xs leading-relaxed text-paper-dim">
                Cria sites? O <Link href="/" className="font-bold text-brand-2 underline">plano
                Agência</Link> tem esta mesma prospecção MAIS o criador de páginas com IA — a
                demonstração pronta que fecha a venda.
              </p>
            </div>
            <div className="rounded-2xl border border-brand-2/30 bg-brand/10 p-7">
              <h3 className="text-xl font-bold">Tudo que vem no Prospector</h3>
              <ul className="mt-4 flex flex-col gap-2.5 text-sm text-paper-dim">
                {INCLUSO.map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <span className="text-ok">✓</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* preço */}
        <section id="preco" className="px-5 py-16">
          <div className="mx-auto max-w-md rounded-3xl border border-brand-2/40 bg-white/[0.03] p-8 text-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-2">
              Um plano só, sem pegadinha
            </span>
            <p className="mt-4 font-display text-5xl font-extrabold">
              R$ {preco}
              <span className="text-lg font-semibold text-paper-dim">/mês</span>
            </p>
            <p className="mt-2 text-sm text-paper-dim">
              Tudo incluso. <b className="text-paper">Sem cobrança por lead</b>, sem crédito para
              comprar, sem consumo escondido.
            </p>
            <div className="mt-6">
              <Botao href="/assinar/prospector" grande>
                Assinar o Prospector
              </Botao>
            </div>
            <p className="mt-3 text-xs text-paper-dim">Cancele quando quiser, direto no painel.</p>
          </div>
        </section>

        {/* faq */}
        <section className="px-5 pb-24 pt-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-3xl leading-[1.1] sm:text-4xl">Dúvidas diretas</h2>
            <div className="mt-8 flex flex-col gap-3">
              {PERGUNTAS.map((q) => (
                <details
                  key={q.p}
                  className="group rounded-xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <summary className="cursor-pointer list-none font-bold [&::-webkit-details-marker]:hidden">
                    {q.p}
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-paper-dim">{q.r}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-5 py-10 text-center text-sm text-paper-dim">
        <p>
          Página<span className="text-brand-2">Pro</span> Prospector · também criamos sites com IA
          — <Link href="/" className="underline hover:text-paper">conheça o PáginaPro completo</Link>
        </p>
      </footer>
    </div>
  );
}
