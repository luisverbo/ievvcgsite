import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import LeitorRevista from "@/components/ebook/LeitorRevista";
import type { EbookRow } from "@/app/app/admin/ebooks/actions";

// Visualização pública da revista digital: qualquer pessoa com o link folheia
// o ebook. O id (uuid) funciona como link não-adivinhável; a busca usa a
// service role porque o leitor anônimo não tem sessão.

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data } = await admin.from("ebooks").select("titulo, subtitulo").eq("id", id).maybeSingle();
  const ebook = data as { titulo: string; subtitulo: string | null } | null;
  return {
    title: ebook ? `${ebook.titulo} — Revista digital` : "Revista digital",
    description: ebook?.subtitulo ?? undefined,
  };
}

export default async function RevistaPublicaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const admin = createAdminClient();
  const { data } = await admin.from("ebooks").select("*").eq("id", id).maybeSingle();
  const ebook = data as EbookRow | null;
  if (!ebook) notFound();

  return (
    <div className="min-h-screen bg-ink px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-extrabold">{ebook.titulo}</h1>
          {ebook.subtitulo && <p className="mt-1 text-sm text-paper-dim">{ebook.subtitulo}</p>}
        </div>
        <LeitorRevista ebook={ebook} admin={false} />
      </div>
    </div>
  );
}
