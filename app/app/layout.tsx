import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ehAdmin } from "@/lib/painel/admin";
import { podeUsar } from "@/lib/painel/permissoes";
import { modoProspector } from "@/lib/painel/prospector";
import { getMinhaOrg } from "@/lib/painel/queries";
import { situacaoDoTeste } from "@/lib/painel/teste";
import { alternarTema, sair } from "./actions";

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

  const [admin, temProspeccao, temConstrutor, prospector, jar, org] = await Promise.all([
    ehAdmin(),
    podeUsar("prospeccao"),
    podeUsar("construtor"),
    modoProspector(),
    cookies(),
    getMinhaOrg(),
  ]);
  // Teste grátis: o menu conta os dias e leva para a assinatura.
  const teste = org ? situacaoDoTeste(org as { plano: string; teste_ate?: string | null }) : null;
  // Lido no servidor: a página já sai na cor certa, sem piscar branco antes.
  const escuro = jar.get("pp_tema")?.value === "escuro";

  return (
    <div
      className={
        prospector
          ? `tema-prospector ${escuro ? "escuro " : ""}min-h-screen`
          : "min-h-screen"
      }
    >
      <header className="sticky top-0 z-40 h-14 border-b border-white/10 bg-ink/85 backdrop-blur">
        <div className="mx-auto flex h-full max-w-[1400px] items-center gap-3 px-4 sm:gap-6 sm:px-6">
          {/* No modo Prospector até o logo muda: é OUTRO produto na cabeça
              de quem comprou, e a identidade tem que confirmar isso. */}
          {prospector ? (
            <Link href="/app" className="flex-none font-display text-lg font-extrabold tracking-tight">
              <span className="text-[#4285F4]">P</span>
              <span className="text-[#EA4335]">r</span>
              <span className="text-[#FBBC05]">o</span>
              <span className="text-[#4285F4]">s</span>
              <span className="text-[#34A853]">p</span>
              <span className="text-[#EA4335]">e</span>ctor
            </Link>
          ) : (
            <Link href="/app" className="flex-none font-display text-lg font-extrabold">
              Página<span className="text-brand-2">Pro</span>
            </Link>
          )}
          {/*
            No celular o menu ROLA para o lado em vez de estourar a tela ou
            esconder metade das páginas atrás de um hambúrguer — os links
            continuam a um toque, e o truque é invisível no desktop.
          */}
          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            {/*
              O tutorial fica FIXO no menu, e não escondido dentro da
              prospecção. Quem precisa dele é quem ainda não instalou o
              agente — ou seja, alguém que ainda não sabe onde as coisas
              ficam. Um link que só aparece "quando falta instalar" some
              justamente quando a pessoa vai reinstalar noutra máquina.
            */}
            {temProspeccao && (
              <Link href="/app/comecar" className={linkClass}>
                Tutorial 🎓
              </Link>
            )}
            {/* Créditos de IA não existem no Prospector — nada ali gasta. */}
            {!prospector && (
              <Link href="/app/creditos" className={linkClass}>
                Créditos
              </Link>
            )}
            {/*
              Em teste grátis, "Assinatura" vira um botão que conta os dias.
              É o lembrete que acompanha a pessoa em toda tela — e o caminho
              de um clique para pagar quando ela decidir.
            */}
            {teste ? (
              <Link
                href="/app/assinatura"
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  teste.acabou
                    ? "bg-danger text-white hover:brightness-110"
                    : "bg-warn/20 text-warn hover:bg-warn/30"
                }`}
              >
                {teste.acabou
                  ? "Teste encerrado · Assinar"
                  : `🎁 ${teste.diasRestantes === 1 ? "Último dia" : `${teste.diasRestantes} dias`} · Assinar`}
              </Link>
            ) : (
              <Link href="/app/assinatura" className={linkClass}>
                Assinatura
              </Link>
            )}
            {/*
              "Minha conta" escrito por extenso no menu. O avatar com e-mail no
              canto direito parecia enfeite: ninguém adivinha que aquilo é
              clicável, e a tela de conta ficava invisível.
            */}
            <Link href="/app/conta" className={linkClass}>
              Minha conta
            </Link>
            {admin && (
              <>
                <Link
                  href="/app/estudio"
                  className="rounded-lg px-3 py-1.5 font-semibold text-warn/80 transition hover:bg-warn/10 hover:text-warn"
                >
                  Estúdio 🎬
                </Link>
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
          <div className="ml-auto flex flex-none items-center gap-2 text-sm">
            {/*
              O e-mail no topo é onde todo mundo procura a conta — então ele é
              o link, e não um texto decorativo. No celular sobra só o avatar.
            */}
            {/* Mesma porta, com cara de botão: borda e ⚙ dizem que clica. */}
            <Link
              href="/app/conta"
              title="Minha conta"
              className="flex items-center gap-2 rounded-lg border border-white/10 px-2.5 py-1.5 text-paper-dim transition hover:border-brand-2 hover:text-paper"
            >
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand/25 text-[11px] font-bold text-brand-2">
                {(user?.email?.[0] ?? "?").toUpperCase()}
              </span>
              <span className="hidden max-w-[14ch] truncate lg:block">{user?.email}</span>
              <span className="text-xs">⚙</span>
            </Link>
            {/* Claro ↔ escuro. Só no Prospector: o painel principal já é escuro. */}
            {prospector && (
              <form action={alternarTema}>
                <button
                  type="submit"
                  title={escuro ? "Mudar para o modo claro" : "Mudar para o modo escuro"}
                  aria-label={escuro ? "Mudar para o modo claro" : "Mudar para o modo escuro"}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-base text-paper-dim transition hover:border-brand-2 hover:text-paper"
                >
                  {escuro ? "☀️" : "🌙"}
                </button>
              </form>
            )}
            {/*
              "Sair" com borda: sem ela, cinza sobre fundo claro não parecia
              clicável nem se enxergava direito — era o único item do topo sem
              contorno.
            */}
            <form action={sair}>
              <button
                type="submit"
                className="rounded-lg border border-white/10 px-3 py-1.5 font-semibold text-paper-dim transition hover:border-danger/50 hover:bg-danger/10 hover:text-danger"
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
