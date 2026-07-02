import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { sair } from "./actions";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-ink-2">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/app" className="font-display text-lg font-extrabold">
            Página<span className="text-brand-2">Pro</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            {user?.email && <span className="hidden text-paper-dim sm:inline">{user.email}</span>}
            <form action={sair}>
              <button type="submit" className="font-semibold text-danger hover:underline">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
