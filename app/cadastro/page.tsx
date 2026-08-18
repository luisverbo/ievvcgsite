import Link from "next/link";
import AuthForm from "../login/AuthForm";
import { cadastrar } from "../login/actions";

import { planoVendidoValido } from "@/lib/pagamentos/planos";

const ROTULO: Record<string, string> = { pro: "Pro", agencia: "Agência" };

export default async function CadastroPage({
  searchParams,
}: {
  // ?plano=... chega de quem clicou no preço na landing: depois de criar a
  // conta ele vai direto para o pagamento daquele plano, sem passear pelo
  // painel procurando onde assina.
  searchParams: Promise<{ plano?: string }>;
}) {
  const { plano: bruto } = await searchParams;
  const plano = planoVendidoValido(bruto ?? "");

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-2 p-8">
        <Link href="/" className="font-display text-xl font-extrabold">
          Página<span className="text-brand-2">Pro</span>
        </Link>
        <p className="mb-6 mt-2 text-sm text-paper-dim">
          {plano
            ? `Crie sua conta para assinar o plano ${ROTULO[plano]}. Na próxima tela você vai direto para o pagamento.`
            : "Crie sua conta grátis e publique sua primeira página em minutos."}
        </p>
        <AuthForm
          action={cadastrar}
          submitLabel={plano ? "Criar conta e assinar" : "Criar conta grátis"}
          de={plano ? `/assinar/${plano}` : undefined}
        />
        <p className="mt-6 text-sm text-paper-dim">
          Já tem conta?{" "}
          <Link
            href={plano ? `/login?de=${encodeURIComponent(`/assinar/${plano}`)}` : "/login"}
            className="font-semibold text-brand-2 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
