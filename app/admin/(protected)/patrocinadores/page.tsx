import { getPatrocinadoresAdmin } from "@/lib/admin/queries";
import { movePatrocinador, removePatrocinador } from "./actions";
import PatrocinadorForm from "./PatrocinadorForm";
import ConfirmSubmitButton from "../ConfirmSubmitButton";
import { cardClass } from "../ui";

export default async function PatrocinadoresPage() {
  const patrocinadores = await getPatrocinadoresAdmin();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-extrabold">Patrocinadores</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        {patrocinadores.map((patrocinador, i) => (
          <div key={patrocinador.id} className={cardClass}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex gap-1">
                <form action={movePatrocinador.bind(null, patrocinador.id, "up")}>
                  <button
                    type="submit"
                    disabled={i === 0}
                    className="rounded-lg border border-white/15 px-2.5 py-1 disabled:opacity-30"
                  >
                    ▲
                  </button>
                </form>
                <form action={movePatrocinador.bind(null, patrocinador.id, "down")}>
                  <button
                    type="submit"
                    disabled={i === patrocinadores.length - 1}
                    className="rounded-lg border border-white/15 px-2.5 py-1 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </form>
              </div>
              <form action={removePatrocinador.bind(null, patrocinador.id)}>
                <ConfirmSubmitButton
                  confirmMessage={`Excluir "${patrocinador.nome}"?`}
                  className="font-semibold text-coral hover:underline"
                >
                  Excluir
                </ConfirmSubmitButton>
              </form>
            </div>
            <PatrocinadorForm patrocinador={patrocinador} />
          </div>
        ))}
      </div>

      <div className={cardClass}>
        <h2 className="mb-4 font-display text-lg font-extrabold">Adicionar patrocinador</h2>
        <PatrocinadorForm />
      </div>
    </div>
  );
}
