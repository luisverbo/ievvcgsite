import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { sair } from "./actions";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 h-14 border-b border-white/10 bg-ink/85 backdrop-blur">
        <div className="mx-auto flex h-full max-w-[1400px] items-center gap-6 px-4 sm:px-6">
          <Link href="/app" className="font-display text-lg font-extrabold">
            Página<span className="text-brand-2">Pro</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/app"
              className="rounded-lg px-3 py-1.5 font-semibold text-paper-dim transition hover:bg-white/8 hover:text-paper"
            >
              Meus sites
            </Link>
            <Link
              href="/app/ia"
              className="rounded-lg px-3 py-1.5 font-semibold text-paper-dim transition hover:bg-white/8 hover:text-paper"
            >
              Criar com IA ✨
            </Link>
            <Link
              href="/app/templates"
              className="hidden rounded-lg px-3 py-1.5 font-semibold text-paper-dim transition hover:bg-white/8 hover:text-paper sm:block"
            >
              Templates
            </Link>
            <Link
              href="/app/assinatura"
              className="hidden rounded-lg px-3 py-1.5 font-semibold text-paper-dim transition hover:bg-white/8 hover:text-paper sm:block"
            >
              Assinatura
            </Link>
            <Link
              href="/app/creditos"
              className="rounded-lg px-3 py-1.5 font-semibold text-paper-dim transition hover:bg-white/8 hover:text-paper"
            >
              Créditos
            </Link>
            {user?.email &&
              user.email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase().trim() && (
                <Link
                  href="/app/admin"
                  className="rounded-lg px-3 py-1.5 font-semibold text-warn transition hover:bg-warn/10"
                >
                  Admin 👑
                </Link>
              )}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {user?.email && (
              <span className="hidden items-center gap-2 text-paper-dim md:flex">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/25 text-xs font-bold text-brand-2">
                  {user.email[0]?.toUpperCase()}
                </span>
                {user.email}
              </span>
            )}
            <form action={sair}>
              <button
                type="submit"
                className="rounded-lg px-3 py-1.5 font-semibold text-paper-dim transition hover:bg-danger/10 hover:text-danger"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      {/* Sem container aqui: páginas comuns usam .painel-wrap; o editor ocupa a tela toda. */}
      <main>{children}</main>
    </div>
  );
}
