import { redirect } from "next/navigation";
import { getMinhaOrg } from "@/lib/painel/queries";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  const org = await getMinhaOrg();
  if (org) redirect("/app");

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-2 p-8">
        <h1 className="text-2xl font-extrabold">Bem-vindo! 🎉</h1>
        <p className="mb-6 mt-2 text-sm text-paper-dim">
          Vamos criar seu espaço. Você pode mudar tudo depois.
        </p>
        <OnboardingForm />
      </div>
    </div>
  );
}
