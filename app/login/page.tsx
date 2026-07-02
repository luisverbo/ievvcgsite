import Link from "next/link";
import AuthForm from "./AuthForm";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string }>;
}) {
  const { de } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-2 p-8">
        <Link href="/" className="font-display text-xl font-extrabold">
          Página<span className="text-brand-2">Pro</span>
        </Link>
        <p className="mb-6 mt-2 text-sm text-paper-dim">Entre na sua conta.</p>
        <AuthForm action={login} submitLabel="Entrar" de={de} />
        <p className="mt-6 text-sm text-paper-dim">
          Não tem conta?{" "}
          <Link href="/cadastro" className="font-semibold text-brand-2 hover:underline">
            Criar conta grátis
          </Link>
        </p>
      </div>
    </div>
  );
}
