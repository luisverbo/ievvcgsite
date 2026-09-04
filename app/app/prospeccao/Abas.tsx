"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/*
 * As abas da prospecção.
 *
 * Antes, tudo morava numa tela só: busca, fila, agente, filtros e a lista
 * de leads, empilhados. Quem entrava para chamar um lead rolava por baixo
 * do formulário de busca; quem entrava para buscar via 60 cards embaixo.
 * Cinco lugares, cinco abas — e o mesmo ponto de partida em todas.
 *
 * Cliente de propósito: a aba ativa vem do pathname, e o servidor não
 * precisa saber de qual tela está renderizando a barra.
 */

const ABAS = [
  { href: "/app/prospeccao", rotulo: "Buscar", emoji: "🔎", exato: true },
  { href: "/app/prospeccao/leads", rotulo: "Leads", emoji: "📋", exato: false },
  { href: "/app/prospeccao/funil", rotulo: "Funil", emoji: "🗂️", exato: false },
  { href: "/app/prospeccao/abordagem", rotulo: "Abordagem", emoji: "💬", exato: false },
  { href: "/app/prospeccao/agente", rotulo: "Agente", emoji: "🤖", exato: false },
];

export default function Abas({ leads }: { leads?: number }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Seções da prospecção"
      className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-ink-2 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {ABAS.map((a) => {
        const ativa = a.exato ? pathname === a.href : pathname.startsWith(a.href);
        return (
          <Link
            key={a.href}
            href={a.href}
            aria-current={ativa ? "page" : undefined}
            className={`flex flex-none items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-bold transition ${
              ativa ? "bg-brand text-white shadow" : "text-paper-dim hover:bg-white/8 hover:text-paper"
            }`}
          >
            <span aria-hidden>{a.emoji}</span>
            {a.rotulo}
            {a.rotulo === "Leads" && typeof leads === "number" && leads > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                  ativa ? "bg-white/20" : "bg-white/10"
                }`}
              >
                {leads}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
