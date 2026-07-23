import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ehAdmin } from "../../actions";
import type { EbookRow } from "../actions";
import Leitor from "./Leitor";

export const maxDuration = 60;

export default async function EbookPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await ehAdmin())) notFound();
  const { id } = await params;

  const supabase = await createClient();
  const { data } = await supabase.from("ebooks").select("*").eq("id", id).maybeSingle();
  const ebook = data as EbookRow | null;
  if (!ebook) notFound();

  return (
    <div className="painel-wrap flex flex-col gap-4">
      <div className="ebook-no-print">
        <Link href="/app/admin/ebooks" className="text-sm text-paper-dim hover:text-paper">
          ← Meus ebooks
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold">{ebook.titulo}</h1>
        {ebook.subtitulo && <p className="mt-1 text-sm text-paper-dim">{ebook.subtitulo}</p>}
      </div>
      <Leitor ebook={ebook} />
    </div>
  );
}
