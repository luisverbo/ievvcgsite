"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "../actions";

const LINKS = [
  { href: "/admin/geral", label: "Geral" },
  { href: "/admin/lineup", label: "Line-up" },
  { href: "/admin/programacao", label: "Programação" },
  { href: "/admin/comidas", label: "Comidas" },
  { href: "/admin/galeria", label: "Galeria" },
  { href: "/admin/faq", label: "FAQ" },
  { href: "/admin/patrocinadores", label: "Patrocinadores" },
];

export default function AdminNav({ email }: { email: string | undefined }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-4 border-b border-white/10 bg-night-2 px-5 py-4 md:min-h-screen md:w-56 md:flex-shrink-0 md:border-b-0 md:border-r md:py-6">
      <div className="font-display text-lg font-extrabold text-cream">
        Festa das <span className="text-gold">Nações</span>
      </div>
      <nav className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
        {LINKS.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold md:rounded-lg ${
                active ? "bg-coral text-cream" : "text-cream-dim hover:text-cream"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-2 pt-4 text-sm text-cream-dim">
        {email && <span className="truncate">{email}</span>}
        <form action={logout}>
          <button type="submit" className="text-left font-semibold text-coral hover:underline">
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
