import Link from "next/link";
import AuthForm from "../login/AuthForm";
import { cadastrar } from "../login/actions";

export default function CadastroPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-2 p-8">
        <Link href="/" className="font-display text-xl font-extrabold">
          Página<span className="text-brand-2">Pro</span>
        </Link>
        <p className="mb-6 mt-2 text-sm text-paper-dim">
          Crie sua conta grátis e publique sua primeira página em minutos.
        </p>
        <AuthForm action={cadastrar} submitLabel="Criar conta grátis" />
        <p className="mt-6 text-sm text-paper-dim">
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold text-brand-2 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
