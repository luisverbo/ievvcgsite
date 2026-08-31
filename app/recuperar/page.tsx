import Link from "next/link";
import { headers } from "next/headers";
import Marca, { ehFunilProspector, ehHostProspector } from "../login/Marca";
import RecuperarForm from "./RecuperarForm";

/*
 * "Esqueci minha senha".
 *
 * Faltava — e a falta trancava do lado de fora justamente quem já está
 * pagando: sem esta tela, a única saída de quem esquece a senha é achar o
 * WhatsApp do suporte.
 *
 * Mantém a marca do funil de onde a pessoa veio, como o login e o cadastro:
 * quem comprou o Prospector não pode encontrar outro nome no meio de uma
 * recuperação de senha, que é exatamente a hora em que se desconfia de golpe.
 */
export default async function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; p?: string; erro?: string }>;
}) {
  const { email, p, erro } = await searchParams;
  const prospector =
    ehFunilProspector({ p }) || ehHostProspector((await headers()).get("host"));

  return (
    <div
      className={`${prospector ? "tema-prospector " : ""}flex min-h-screen items-center justify-center px-5`}
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-2 p-8">
        <Marca prospector={prospector} />
        <h1 className="mt-4 font-display text-xl font-extrabold">Esqueceu a senha?</h1>
        <p className="mb-6 mt-1.5 text-sm text-paper-dim">
          Diga o e-mail que você usa para entrar. Mandamos um link para você criar uma senha nova —
          não precisa lembrar da antiga.
        </p>

        {erro === "link" && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            Esse link não vale mais. Eles expiram por segurança, e só funcionam uma vez e no mesmo
            navegador em que foram pedidos. Peça um novo abaixo.
          </p>
        )}

        <RecuperarForm emailInicial={email} />

        <p className="mt-6 text-sm text-paper-dim">
          Lembrou?{" "}
          <Link href="/login" className="font-semibold text-brand-2 hover:underline">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}
