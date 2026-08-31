import Link from "next/link";
import { headers } from "next/headers";
import AuthForm from "./AuthForm";
import Marca, { ehFunilProspector, ehHostProspector } from "./Marca";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  // ?de= guarda para onde ir depois de entrar; ?p= diz de qual produto a
  // pessoa veio, para a tela não trocar a marca debaixo do nariz dela.
  searchParams: Promise<{ de?: string; p?: string }>;
}) {
  const { de, p } = await searchParams;
  const prospector =
    ehFunilProspector({ de, p }) || ehHostProspector((await headers()).get("host"));

  return (
    <div className={`${prospector ? "tema-prospector " : ""}flex min-h-screen items-center justify-center px-5`}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-2 p-8">
        <Marca prospector={prospector} />
        <p className="mb-6 mt-2 text-sm text-paper-dim">Entre na sua conta.</p>
        <AuthForm action={login} submitLabel="Entrar" de={de} />
        <p className="mt-6 text-sm text-paper-dim">
          Não tem conta?{" "}
          <Link
            href={prospector ? "/cadastro?plano=prospector" : "/cadastro"}
            className="font-semibold text-brand-2 hover:underline"
          >
            {prospector ? "Assinar o Prospector" : "Criar conta grátis"}
          </Link>
        </p>
      </div>
    </div>
  );
}
