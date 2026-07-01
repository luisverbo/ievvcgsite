import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { removeColaborador } from "./actions";
import AddColaboradorForm from "./AddColaboradorForm";
import ConfirmSubmitButton from "../ConfirmSubmitButton";
import { cardClass } from "../ui";

export default async function ColaboradoresPage() {
  const supabase = await createClient();
  const {
    data: { user: atual },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data } = await admin.auth.admin.listUsers();
  const usuarios = data?.users ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-2 font-display text-2xl font-extrabold">Colaboradores</h1>
        <p className="text-sm text-cream-dim">
          Quem tiver email e senha aqui pode entrar em /admin e editar o site.
        </p>
      </div>

      <div className={cardClass}>
        <div className="flex flex-col divide-y divide-white/10">
          {usuarios.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <div className="font-semibold">{u.email}</div>
                <div className="text-xs text-cream-dim">
                  {u.id === atual?.id ? "você" : "colaborador"}
                </div>
              </div>
              {u.id !== atual?.id && (
                <form action={removeColaborador.bind(null, u.id)}>
                  <ConfirmSubmitButton
                    confirmMessage={`Remover o acesso de ${u.email}?`}
                    className="font-semibold text-coral hover:underline"
                  >
                    Remover
                  </ConfirmSubmitButton>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={cardClass}>
        <h2 className="mb-4 font-display text-lg font-extrabold">Adicionar colaborador</h2>
        <AddColaboradorForm />
      </div>
    </div>
  );
}
