import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ehAdmin } from "@/lib/painel/admin";
import { podeUsar } from "@/lib/painel/permissoes";
import { sair } from "./actions";

/*
 * O menu mostra SÓ o que o usuário pode usar.
 *
 * Link para tela bloqueada é a pior vitrine: o cliente clica, dá "não
 * encontrado" e ele conclui que o sistema está quebrado. Recurso de plano
 * maior aparece como convite na home, não como porta trancada no menu.
 *
 * As ferramentas internas (blocos, templates, admin) nem entram aqui para o
 * cliente — cada rota delas também se defende sozinha com ehAdmin().
 */

const linkClass =
  "rounded-lg px-3 py-1.5 font-semibold text-paper-dim transition hover:bg-white/8 hover:text-paper";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [admin, temProspeccao, temConstrutor] = await Promise.all([
    ehAdmin(),
    podeUsar("prospeccao"),
    podeUsar("construtor"),
  ]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 h-14 border-b border-white/10 bg-ink/85 backdrop-blur">
        <div className="mx-auto flex h-full max-w-[1400px] items-center gap-6 px-4 sm:px-6">
          <Link href="/app" className="font-display text-lg font-extrabold">
            Página<span className="text-brand-2">Pro</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/app" className={linkClass}>
              Início
            </Link>
            {temConstrutor && (
              <Link href="/app/ia" className={linkClass}>
                Minhas páginas ✨
              </Link>
            )}
            {temProspeccao && (
              <Link href="/app/prospeccao" className={linkClass}>
                Prospecção 🎯
              </Link>
            )}
            <Link href="/app/creditos" className={linkClass}>
              Créditos
            </Link>
            <Link href="/app/assinatura" className={`hidden sm:block ${linkClass}`}>
              Assinatura
            </Link>
            {admin && (
              <>
                <Link
                  href="/app/sites"
                  className="hidden rounded-lg px-3 py-1.5 font-semibold text-warn/80 transition hover:bg-warn/10 hover:text-warn lg:block"
                >
                  Blocos 🧱
                </Link>
                <Link
                  href="/app/admin"
                  className="rounded-lg px-3 py-1.5 font-semibold text-warn transition hover:bg-warn/10"
                >
                  Admin 👑
                </Link>
              </>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-2 text-sm">
            {/*
              O e-mail no topo é onde todo mundo procura a conta — então ele é
              o link, e não um texto decorativo. No celular sobra só o avatar.
            */}
            <Link
              href="/app/conta"
              title="Minha conta"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-paper-dim transition hover:bg-white/8 hover:text-paper"
            >
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand/25 text-xs font-bold text-brand-2">
                {(user?.email?.[0] ?? "?").toUpperCase()}
              </span>
              <span className="hidden max-w-[16ch] truncate md:block">{user?.email}</span>
            </Link>
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
