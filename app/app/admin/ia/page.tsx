import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { getAnthropicKey } from "@/lib/ia/anthropic";
import { MODELOS_IA } from "@/lib/ia/modelos";
import { ehAdmin } from "../actions";
import NovaPagina from "./NovaPagina";
import { excluirPaginaIA, type SiteIA } from "./actions";
import { cardClass } from "@/components/painel/ui";
import { IconTrash } from "@/components/painel/icons";

export default async function PaginasIAPage() {
  if (!(await ehAdmin())) notFound();
  const org = await getMinhaOrg();
  if (!org) notFound();

  const [chave, supabase] = await Promise.all([getAnthropicKey(), createClient()]);
  const { data } = await supabase
    .from("sites_ia")
    .select("*")
    .eq("org_id", org.id)
    .order("updated_at", { ascending: false });
  const paginas = (data as SiteIA[] | null) ?? [];

  return (
    <div className="painel-wrap flex flex-col gap-6">
      <div>
        <Link href="/app/admin" className="text-sm text-paper-dim hover:text-paper">
          ← Admin
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold">Construtor de páginas com IA ✨</h1>
        <p className="mt-1 text-sm text-paper-dim">
          Aqui a IA escreve o site inteiro — sem blocos, com liberdade total de layout, efeitos e
          animações. Você conversa com ela até a página ficar do jeito que quer.
        </p>
      </div>

      <div className={cardClass}>
        <h2 className="mb-4 text-lg font-bold">Nova página</h2>
        <NovaPagina temChave={Boolean(chave)} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-paper-dim">
          Minhas páginas ({paginas.length})
        </h2>
        {paginas.length === 0 ? (
          <p className={`${cardClass} text-sm text-paper-dim`}>
            Nenhuma página ainda. Crie a primeira aí em cima e descreva o que você quer no chat.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {paginas.map((p) => (
              <div key={p.id} className={`${cardClass} flex flex-col gap-3`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="min-w-0 flex-1 truncate font-bold">{p.titulo}</h3>
                    {p.publicado && (
                      <span className="flex-none rounded-full bg-ok/20 px-2 py-0.5 text-xs font-bold text-ok">
                        no ar
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-paper-dim">
                    /ia/{p.slug} · {MODELOS_IA[p.modelo]?.rotulo ?? p.modelo}
                  </p>
                  <p className="mt-0.5 text-xs text-paper-dim">
                    {p.html ? "Página criada" : "Ainda vazia"} ·{" "}
                    {new Date(p.updated_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/app/admin/ia/${p.id}`}
                    className="flex-1 rounded-lg bg-brand px-3 py-2 text-center text-sm font-bold text-white transition hover:bg-brand-2"
                  >
                    Abrir
                  </Link>
                  <form action={excluirPaginaIA.bind(null, p.id)}>
                    <button
                      type="submit"
                      title="Excluir página"
                      className="flex h-full items-center justify-center rounded-lg border border-white/15 px-3 text-paper-dim transition hover:border-danger hover:text-danger"
                    >
                      <IconTrash size={15} />
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
