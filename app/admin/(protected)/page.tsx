import Link from "next/link";

const SECOES = [
  { href: "/admin/geral", label: "Geral", pronto: true },
  { href: "/admin/lineup", label: "Line-up", pronto: false },
  { href: "/admin/programacao", label: "Programação", pronto: false },
  { href: "/admin/comidas", label: "Comidas", pronto: false },
  { href: "/admin/galeria", label: "Galeria", pronto: false },
  { href: "/admin/faq", label: "FAQ", pronto: false },
  { href: "/admin/patrocinadores", label: "Patrocinadores", pronto: false },
];

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-extrabold">Painel</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECOES.map((secao) =>
          secao.pronto ? (
            <Link
              key={secao.href}
              href={secao.href}
              className="rounded-xl border border-white/10 bg-night-2 p-5 font-semibold hover:border-gold"
            >
              {secao.label}
            </Link>
          ) : (
            <div
              key={secao.href}
              className="rounded-xl border border-dashed border-white/15 p-5 font-semibold text-cream-dim"
            >
              {secao.label} <span className="text-xs">· em breve</span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
