import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ehAdmin } from "../actions";
import { getOpenAIKey } from "@/lib/ebooks/openai";
import { getMinhaOrg } from "@/lib/painel/queries";
import NovoEbook from "./NovoEbook";
import ChaveForm from "./ChaveForm";
import { excluirEbook, type EbookRow } from "./actions";
import { cardClass } from "@/components/painel/ui";

export const maxDuration = 60;

const FORMATOS: Record<string, string> = { a4: "A4", mobile: "Mobile", quadrado: "Quadrado" };

export default async function EbooksPage() {
  if (!(await ehAdmin())) notFound();
  const org = await getMinhaOrg();
  if (!org) notFound();

  const chave = await getOpenAIKey();
  const supabase = await createClient();
  const { data } = await supabase
    .from("ebooks")
    .select("*")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false });
  const ebooks = (data as EbookRow[] | null) ?? [];

  return (
    <div className="painel-wrap flex flex-col gap-6">
      <div>
        <Link href="/app/admin" className="text-sm text-paper-dim hover:text-paper">
          ← Admin
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold">Ebooks IA 📖</h1>
        <p className="mt-1 text-sm text-paper-dim">
          Descreva o tema, escolha o formato e o número de páginas — a IA escreve o conteúdo e cria
          as imagens, no estilo revista digital.
        </p>
      </div>

      <div className={cardClass}>
        <h2 className="mb-1 text-lg font-bold">🔑 Chave da OpenAI</h2>
        <p className="mb-4 text-sm text-paper-dim">
          {chave
            ? `Chave configurada (termina em …${chave.slice(-4)}). Cole outra para substituir.`
            : "Cole sua chave (começa com sk-). Ela fica guardada no servidor e nunca aparece no navegador."}
        </p>
        <ChaveForm temChave={Boolean(chave)} />
      </div>

      <div className={cardClass}>
        <h2 className="mb-4 text-lg font-bold">✨ Criar novo ebook</h2>
        <NovoEbook temChave={Boolean(chave)} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-paper-dim">
          Meus ebooks
        </h2>
        {ebooks.length === 0 ? (
          <p className="rounded-xl border border-white/10 p-6 text-center text-sm text-paper-dim">
            Nenhum ebook ainda. Crie o primeiro acima. 🚀
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ebooks.map((e) => {
              const capa = e.paginas[0]?.imagem_url;
              return (
                <div
                  key={e.id}
                  className="group overflow-hidden rounded-xl border border-white/10 bg-ink-2 transition hover:-translate-y-0.5 hover:border-brand-2/60"
                >
                  <Link href={`/app/admin/ebooks/${e.id}`} className="block">
                    <div
                      className="flex h-40 items-center justify-center bg-cover bg-center text-4xl"
                      style={capa ? { backgroundImage: `url(${capa})` } : undefined}
                    >
                      {!capa && "📖"}
                    </div>
                  </Link>
                  <div className="flex items-start justify-between gap-2 p-4">
                    <div className="min-w-0">
                      <Link href={`/app/admin/ebooks/${e.id}`} className="block truncate font-bold hover:text-brand-2">
                        {e.titulo}
                      </Link>
                      <span className="text-xs text-paper-dim">
                        {FORMATOS[e.formato]} · {e.paginas.length} págs ·{" "}
                        {e.status === "pronto" ? "✅ Pronto" : e.status === "gerando" ? "⏳ Gerando" : "⚠️ Erro"}
                      </span>
                    </div>
                    <form action={excluirEbook.bind(null, e.id)}>
                      <button className="text-sm text-danger opacity-0 transition hover:underline group-hover:opacity-100">
                        Excluir
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
