import Link from "next/link";

const SECOES = [
  { href: "/admin/geral", label: "Geral" },
  { href: "/admin/textos", label: "Textos" },
  { href: "/admin/lineup", label: "Line-up" },
  { href: "/admin/programacao", label: "Programação" },
  { href: "/admin/comidas", label: "Comidas" },
  { href: "/admin/galeria", label: "Galeria" },
  { href: "/admin/faq", label: "FAQ" },
  { href: "/admin/patrocinadores", label: "Patrocinadores" },
  { href: "/admin/colaboradores", label: "Colaboradores" },
];

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-extrabold">Painel</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECOES.map((secao) => (
          <Link
            key={secao.href}
            href={secao.href}
            className="rounded-xl border border-white/10 bg-night-2 p-5 font-semibold hover:border-gold"
          >
            {secao.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
