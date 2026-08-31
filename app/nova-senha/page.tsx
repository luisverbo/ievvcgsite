import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import Marca, { ehHostProspector } from "../login/Marca";
import NovaSenhaForm from "./NovaSenhaForm";

export const dynamic = "force-dynamic";

/*
 * A tela de criar a senha nova, aberta pelo link do e-mail.
 *
 * Sem sessão não há o que fazer aqui: o link já foi usado, expirou, ou a
 * pessoa digitou o endereço na mão. Em vez de uma tela de erro, ela volta
 * para /recuperar com o formulário pronto — a saída é sempre pedir outro
 * link, então é para lá que a tela leva.
 */
export default async function NovaSenhaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/recuperar?erro=link");

  const prospector = ehHostProspector((await headers()).get("host"));

  return (
    <div
      className={`${prospector ? "tema-prospector " : ""}flex min-h-screen items-center justify-center px-5`}
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-2 p-8">
        <Marca prospector={prospector} />
        <h1 className="mt-4 font-display text-xl font-extrabold">Crie uma senha nova</h1>
        <p className="mb-6 mt-1.5 text-sm text-paper-dim">
          Confirmamos que é você, <b className="text-paper">{user.email}</b>. Escolha a senha nova e
          você já entra direto.
        </p>
        <NovaSenhaForm />
      </div>
    </div>
  );
}
