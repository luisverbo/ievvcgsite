import { redirect } from "next/navigation";
import { getMinhaOrg } from "@/lib/painel/queries";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage({
  searchParams,
}: {
  // ?de=/assinar/<plano> — quem veio do preço da landing volta ao pagamento
  // assim que a organização existir. ?plano= é a porta de entrada de quem
  // já tinha conta mas ainda não tinha espaço criado.
  searchParams: Promise<{ de?: string; plano?: string }>;
}) {
  const org = await getMinhaOrg();
  const { de, plano } = await searchParams;
  const destino =
    de?.startsWith("/assinar") ? de : plano ? `/assinar/${plano}` : "";

  if (org) redirect(destino || "/app");

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-2 p-8">
        <h1 className="text-2xl font-extrabold">Bem-vindo! 🎉</h1>
        <p className="mb-6 mt-2 text-sm text-paper-dim">
          {destino
            ? "Só falta o nome do seu espaço — depois dele você segue direto para o pagamento."
            : "Vamos criar seu espaço. Você pode mudar tudo depois."}
        </p>
        <OnboardingForm de={destino || undefined} />
      </div>
    </div>
  );
}
