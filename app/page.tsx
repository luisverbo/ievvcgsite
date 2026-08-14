import Link from "next/link";
import {
  LINK_ASSINATURA,
  LINK_WHATSAPP,
  PRECO_MENSAL,
  DORES,
  PASSOS,
  RECURSOS,
  PERGUNTAS,
  NO_PLANO,
} from "@/lib/vendas";

export const metadata = {
  title: "PáginaPro — crie sites com IA e encontre quem precisa deles",
  description:
    "Crie landing pages com IA em minutos, descubra empresas sem site na sua cidade e feche no WhatsApp. Tudo em um assinatura só.",
};

/* Botão principal. Um componente só para o estilo nunca sair do lugar. */
function Botao({
  href,
  children,
  variante = "primario",
  tamanho = "normal",
}: {
  href: string;
  children: React.ReactNode;
  variante?: "primario" | "fantasma";
  tamanho?: "normal" | "grande";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-bold transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-2";
  const medida = tamanho === "grande" ? "px-8 py-4 text-base sm:text-lg" : "px-6 py-3 text-sm";
  const cor =
    variante === "primario"
      ? "bg-brand text-white shadow-[0_10px_40px_-12px_rgba(108,92,231,0.9)] hover:-translate-y-0.5 hover:bg-brand-2"
      : "border border-white/15 text-paper hover:border-brand-2 hover:text-brand-2";
  return (
    <Link href={href} className={`${base} ${medida} ${cor}`}>
      {children}
    </Link>
  );
}

function Secao({
  chapeu,
  titulo,
  subtitulo,
}: {
  chapeu: string;
  titulo: React.ReactNode;
  subtitulo?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-2">{chapeu}</span>
      <h2 className="mt-3 text-3xl leading-[1.1] sm:text-5xl">{titulo}</h2>
      {subtitulo && <p className="mt-4 text-base text-paper-dim sm:text-lg">{subtitulo}</p>}
    </div>
  );
}

export default function Home() {
  return (
    <div className="overflow-x-hidden">
      {/* ---------------------------------------------------------------- */}
      {/* aviso do topo                                                     */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-gradient-to-r from-brand to-brand-2 px-4 py-2.5 text-center text-sm font-semibold text-white">
        🚀 Sem fidelidade — cancele quando quiser, em dois cliques, sem falar com ninguém
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* cabeçalho                                                         */}
      {/* ---------------------------------------------------------------- */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <span className="font-display text-xl font-extrabold">
            Página<span className="text-brand-2">Pro</span>
          </span>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-paper-dim md:flex">
            <a href="#como" className="transition hover:text-paper">
              Como funciona
            </a>
            <a href="#recursos" className="transition hover:text-paper">
              Recursos
            </a>
            <a href="#preco" className="transition hover:text-paper">
              Preço
            </a>
            <a href="#faq" className="transition hover:text-paper">
              Dúvidas
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden px-3 py-2 text-sm font-semibold text-paper-dim transition hover:text-paper sm:block"
            >
              Entrar
            </Link>
            <Botao href={LINK_ASSINATURA}>Começar</Botao>
          </div>
        </div>
      </header>

      <main>
        {/* -------------------------------------------------------------- */}
        {/* hero                                                            */}
        {/* -------------------------------------------------------------- */}
        <section className="relative isolate overflow-hidden px-5 pb-24 pt-20 sm:pt-28">
          {/* brilho de fundo — puro CSS, nada para carregar */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[-18rem] -z-10 h-[38rem] w-[70rem] -translate-x-1/2 rounded-full opacity-40 blur-[120px]"
            style={{
              background:
                "radial-gradient(closest-side, #6c5ce7, rgba(142,123,255,0.35), transparent)",
            }}
          />
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold text-paper-dim">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" />
              Feito no Brasil, para vender no Brasil
            </span>

            <h1 className="mt-7 text-4xl leading-[1.05] sm:text-6xl lg:text-7xl">
              Crie o site em minutos.
              <br />
              <span className="bg-gradient-to-r from-brand-2 via-pink to-warn bg-clip-text text-transparent">
                Descubra quem precisa dele.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-paper-dim sm:text-xl">
              A IA escreve a landing page inteira. O sistema encontra as empresas da sua cidade que
              ainda não têm site e fala com elas no WhatsApp. Você só fecha e cobra.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Botao href={LINK_ASSINATURA} tamanho="grande">
                Começar agora →
              </Botao>
              <Botao href="#como" variante="fantasma" tamanho="grande">
                Ver como funciona
              </Botao>
            </div>

            <p className="mt-4 text-sm text-paper-dim">
              Sem fidelidade · cancela sozinho no painel, quando quiser
            </p>
          </div>

          {/* prova visual: a tela do produto, desenhada em CSS */}
          <div className="mx-auto mt-16 max-w-4xl">
            <div className="rounded-2xl border border-white/10 bg-ink-2 p-2 shadow-[0_40px_120px_-40px_rgba(108,92,231,0.6)]">
              <div className="flex items-center gap-1.5 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-ok/70" />
              </div>
              <div className="grid gap-3 rounded-xl bg-ink p-4 sm:grid-cols-3">
                {[
                  { r: "Dentista · Barra da Tijuca", n: "94", c: "text-ok", s: "só Instagram" },
                  { r: "Advogado · Recreio", n: "81", c: "text-ok", s: "sem site" },
                  { r: "Pizzaria · Jacarepaguá", n: "67", c: "text-warn", s: "site antigo" },
                ].map((e) => (
                  <div key={e.r} className="rounded-lg border border-white/10 p-3 text-left">
                    <div className="flex items-baseline justify-between">
                      <span className={`font-display text-2xl font-extrabold ${e.c}`}>{e.n}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-paper-dim">
                        {e.s}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-paper-dim">{e.r}</p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full rounded-full bg-current ${e.c}`} style={{ width: `${e.n}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-paper-dim">
              Nota de potencial: quanto maior, mais fácil a venda.
            </p>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* dor                                                             */}
        {/* -------------------------------------------------------------- */}
        <section className="border-t border-white/10 bg-ink-2/40 px-5 py-24">
          <Secao
            chapeu="O problema real"
            titulo={
              <>
                Fazer o site nunca foi o gargalo.
                <br />
                <span className="text-paper-dim">Achar quem compra é.</span>
              </>
            }
          />
          <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
            {DORES.map((d) => (
              <div
                key={d.titulo}
                className="rounded-2xl border border-white/10 bg-ink p-6 transition hover:border-danger/40"
              >
                <h3 className="text-lg leading-snug text-paper">{d.titulo}</h3>
                <p className="mt-3 text-sm leading-relaxed text-paper-dim">{d.texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* como funciona                                                   */}
        {/* -------------------------------------------------------------- */}
        <section id="como" className="scroll-mt-20 px-5 py-24">
          <Secao
            chapeu="Como funciona"
            titulo="Quatro passos, do zero ao cliente pagando"
            subtitulo="O caminho inteiro dentro de um sistema só — sem planilha, sem lista comprada, sem ficar procurando cliente no escuro."
          />
          <div className="mx-auto mt-14 max-w-4xl">
            <ol className="relative flex flex-col gap-10 border-l border-white/10 pl-8 sm:pl-12">
              {PASSOS.map((p) => (
                <li key={p.numero} className="relative">
                  <span className="absolute -left-[3.05rem] flex h-10 w-10 items-center justify-center rounded-full border border-brand-2/40 bg-ink font-display text-sm font-extrabold text-brand-2 sm:-left-[4.05rem]">
                    {p.numero}
                  </span>
                  <h3 className="text-xl text-paper sm:text-2xl">{p.titulo}</h3>
                  <p className="mt-2 max-w-xl text-base leading-relaxed text-paper-dim">{p.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* conta que fecha                                                 */}
        {/* -------------------------------------------------------------- */}
        <section className="border-y border-white/10 bg-gradient-to-b from-brand/10 to-transparent px-5 py-24">
          <Secao
            chapeu="A conta"
            titulo="Um cliente já paga o ano inteiro"
            subtitulo="A mensalidade custa menos que o café da equipe. O primeiro site que você vender já cobre vários meses."
          />
          <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
            {[
              { valor: `R$ ${PRECO_MENSAL}`, rotulo: "por mês, tudo incluso" },
              { valor: "R$ 1.200", rotulo: "média cobrada por uma landing page" },
              { valor: "4×", rotulo: "o que sobra já no primeiro site vendido" },
            ].map((e) => (
              <div
                key={e.rotulo}
                className="rounded-2xl border border-white/10 bg-ink-2 p-7 text-center"
              >
                <div className="font-display text-4xl font-extrabold text-paper">{e.valor}</div>
                <div className="mt-2 text-sm text-paper-dim">{e.rotulo}</div>
              </div>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* recursos                                                        */}
        {/* -------------------------------------------------------------- */}
        <section id="recursos" className="scroll-mt-20 px-5 py-24">
          <Secao
            chapeu="O que vem junto"
            titulo="Tudo que uma agência de site precisa"
            subtitulo="Sem plugin, sem contratar ferramenta por fora, sem mensalidade escondida."
          />
          <div className="mx-auto mt-12 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {RECURSOS.map((r) => (
              <div
                key={r.titulo}
                className="group rounded-2xl border border-white/10 bg-ink-2 p-6 transition hover:-translate-y-1 hover:border-brand-2/50"
              >
                <span className="text-3xl">{r.icone}</span>
                <h3 className="mt-4 text-base text-paper">{r.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-paper-dim">{r.texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* preço                                                           */}
        {/* -------------------------------------------------------------- */}
        <section id="preco" className="scroll-mt-20 border-t border-white/10 px-5 py-24">
          <Secao
            chapeu="Preço"
            titulo="Um plano. Tudo liberado."
            subtitulo="Sem pegadinha de “a partir de”, sem cobrar por site criado, sem limite de clientes."
          />

          <div className="mx-auto mt-12 max-w-lg">
            <div className="relative rounded-3xl border border-brand-2/40 bg-ink-2 p-8 shadow-[0_40px_120px_-50px_rgba(108,92,231,0.9)]">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-4 py-1 text-xs font-bold text-white">
                MAIS COMPLETO
              </span>

              <h3 className="text-2xl">Agência</h3>
              <p className="mt-1 text-sm text-paper-dim">
                Para quem vive de vender site — ou quer começar a viver.
              </p>

              <div className="mt-6 flex items-end gap-2">
                <span className="font-display text-6xl font-extrabold text-paper">
                  R$ {PRECO_MENSAL}
                </span>
                <span className="pb-2 text-lg font-bold text-paper-dim">/mês</span>
              </div>

              <ul className="mt-7 flex flex-col gap-3">
                {NO_PLANO.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-paper">
                    <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-ok/20 text-xs font-bold text-ok">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link
                  href={LINK_ASSINATURA}
                  className="flex w-full items-center justify-center rounded-full bg-brand px-6 py-4 text-base font-bold text-white shadow-[0_10px_40px_-12px_rgba(108,92,231,0.9)] transition hover:-translate-y-0.5 hover:bg-brand-2"
                >
                  Assinar agora →
                </Link>
              </div>

              <p className="mt-4 text-center text-xs text-paper-dim">
                Cartão de crédito · renova sozinho · cancela no painel quando quiser
              </p>
            </div>

            <p className="mt-6 text-center text-sm text-paper-dim">
              Ficou com dúvida antes de assinar?{" "}
              <a
                href={LINK_WHATSAPP}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-brand-2 underline underline-offset-4"
              >
                Fala comigo no WhatsApp
              </a>
              .
            </p>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* garantia                                                        */}
        {/* -------------------------------------------------------------- */}
        <section className="px-5 pb-24">
          <div className="mx-auto max-w-3xl rounded-3xl border border-ok/30 bg-ok/5 p-8 text-center sm:p-10">
            <span className="text-4xl">🛡️</span>
            <h2 className="mt-4 text-2xl sm:text-3xl">Sem risco de ficar preso</h2>
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-paper-dim">
              Não tem fidelidade nem multa. Se não fizer sentido, cancela pelo painel em dois
              cliques — sem ligar para ninguém, sem justificar. O que você pagou vale até o fim do
              mês, e os sites que você baixou continuam seus.
            </p>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* FAQ                                                             */}
        {/* -------------------------------------------------------------- */}
        <section id="faq" className="scroll-mt-20 border-t border-white/10 px-5 py-24">
          <Secao chapeu="Dúvidas" titulo="O que perguntam antes de assinar" />
          <div className="mx-auto mt-12 flex max-w-3xl flex-col gap-3">
            {PERGUNTAS.map((p) => (
              <details
                key={p.pergunta}
                className="group rounded-2xl border border-white/10 bg-ink-2 px-6 py-5 transition open:border-brand-2/40"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-bold text-paper marker:hidden">
                  {p.pergunta}
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full border border-white/15 text-sm text-paper-dim transition group-open:rotate-45 group-open:border-brand-2 group-open:text-brand-2">
                    +
                  </span>
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-paper-dim">{p.resposta}</p>
              </details>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* chamada final                                                   */}
        {/* -------------------------------------------------------------- */}
        <section className="relative isolate overflow-hidden px-5 py-28">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[30rem] w-[60rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[120px]"
            style={{ background: "radial-gradient(closest-side, #6c5ce7, transparent)" }}
          />
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl leading-tight sm:text-5xl">
              Existem centenas de empresas sem site na sua cidade.
              <br />
              <span className="text-brand-2">Alguém vai vender para elas.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-paper-dim">
              Em 10 minutos você faz a primeira busca, vê a lista e manda a primeira mensagem.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Botao href={LINK_ASSINATURA} tamanho="grande">
                Começar agora →
              </Botao>
              <Botao href="/login" variante="fantasma" tamanho="grande">
                Já sou cliente
              </Botao>
            </div>
          </div>
        </section>
      </main>

      {/* ---------------------------------------------------------------- */}
      {/* rodapé                                                            */}
      {/* ---------------------------------------------------------------- */}
      <footer className="border-t border-white/10 px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-paper-dim sm:flex-row">
          <span className="font-display text-base font-extrabold text-paper">
            Página<span className="text-brand-2">Pro</span>
          </span>
          <nav className="flex flex-wrap items-center justify-center gap-5">
            <a href="#preco" className="transition hover:text-paper">
              Preço
            </a>
            <a href="#faq" className="transition hover:text-paper">
              Dúvidas
            </a>
            <Link href="/login" className="transition hover:text-paper">
              Entrar
            </Link>
            <a href={LINK_WHATSAPP} target="_blank" rel="noreferrer" className="transition hover:text-paper">
              WhatsApp
            </a>
          </nav>
          <span>© {new Date().getFullYear()} PáginaPro</span>
        </div>
      </footer>
    </div>
  );
}
