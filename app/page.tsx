import Link from "next/link";
import { btnPrimary, btnGhost } from "@/components/painel/ui";

const DESTAQUES = [
  {
    titulo: "Impossível ficar feio",
    texto: "Blocos com design profissional garantido. Perfeito no celular, sempre.",
  },
  {
    titulo: "Métricas nativas",
    texto: "Visitas, cliques por botão, origem (Instagram, Facebook…) e horários — sem configurar nada.",
  },
  {
    titulo: "Feito para o Brasil",
    texto: "WhatsApp nativo, preço em real, 100% em português. Templates por nicho prontos.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <div className="font-display text-xl font-extrabold">
          Página<span className="text-brand-2">Pro</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-semibold text-paper-dim hover:text-paper">
            Entrar
          </Link>
          <Link href="/cadastro" className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-2">
            Criar conta grátis
          </Link>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <h1 className="max-w-3xl text-4xl font-extrabold leading-tight sm:text-6xl">
          Landing pages e funis que <span className="text-brand-2">convertem</span>, prontos em
          minutos
        </h1>
        <p className="mt-6 max-w-xl text-lg text-paper-dim">
          Escolha um template do seu nicho, troque textos e fotos, publique. Com métricas de
          verdade e integração com WhatsApp — sem mensalidade em dólar.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/cadastro" className={btnPrimary}>
            Começar grátis
          </Link>
          <Link href="/login" className={btnGhost}>
            Já tenho conta
          </Link>
        </div>

        <div className="mt-20 grid gap-5 text-left sm:grid-cols-3">
          {DESTAQUES.map((d) => (
            <div key={d.titulo} className="rounded-2xl border border-white/10 bg-ink-2 p-6">
              <h3 className="text-lg font-bold">{d.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-paper-dim">{d.texto}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="py-8 text-center text-xs text-paper-dim">
        PáginaPro — em construção. Feito no Brasil 🇧🇷
      </footer>
    </div>
  );
}
