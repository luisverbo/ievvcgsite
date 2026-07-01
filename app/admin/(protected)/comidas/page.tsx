import { getComidasAdmin } from "@/lib/admin/queries";
import { moveComida, removeComida } from "./actions";
import ComidaForm from "./ComidaForm";
import ConfirmSubmitButton from "../ConfirmSubmitButton";
import { cardClass } from "../ui";

export default async function ComidasPage() {
  const comidas = await getComidasAdmin();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-extrabold">Comidas</h1>

      <div className={cardClass}>
        <div className="flex flex-col gap-3">
          {comidas.map((comida, i) => (
            <div key={comida.id} className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="flex gap-1">
                <form action={moveComida.bind(null, comida.id, "up")}>
                  <button
                    type="submit"
                    disabled={i === 0}
                    className="rounded-lg border border-white/15 px-2 py-1 text-xs disabled:opacity-30"
                  >
                    ▲
                  </button>
                </form>
                <form action={moveComida.bind(null, comida.id, "down")}>
                  <button
                    type="submit"
                    disabled={i === comidas.length - 1}
                    className="rounded-lg border border-white/15 px-2 py-1 text-xs disabled:opacity-30"
                  >
                    ▼
                  </button>
                </form>
              </div>
              <div className="flex-1">
                <ComidaForm comida={comida} />
              </div>
              <form action={removeComida.bind(null, comida.id)}>
                <ConfirmSubmitButton
                  confirmMessage={`Excluir "${comida.pais}"?`}
                  className="font-semibold text-coral hover:underline"
                >
                  Excluir
                </ConfirmSubmitButton>
              </form>
            </div>
          ))}
        </div>
      </div>

      <div className={cardClass}>
        <h2 className="mb-4 font-display text-lg font-extrabold">Adicionar stand</h2>
        <ComidaForm />
      </div>
    </div>
  );
}
