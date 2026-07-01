import { getGaleriaAdmin } from "@/lib/admin/queries";
import { moveGaleriaFoto, removeGaleriaFoto } from "./actions";
import AddFotoForm from "./AddFotoForm";
import ConfirmSubmitButton from "../ConfirmSubmitButton";
import { cardClass } from "../ui";

export default async function GaleriaPage() {
  const fotos = await getGaleriaAdmin();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-extrabold">Galeria</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fotos.map((foto, i) => (
          <div key={foto.id} className={cardClass}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={foto.imagem_url}
              alt=""
              className="mb-3 aspect-square w-full rounded-lg object-cover"
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1">
                <form action={moveGaleriaFoto.bind(null, foto.id, "up")}>
                  <button
                    type="submit"
                    disabled={i === 0}
                    className="rounded-lg border border-white/15 px-2 py-1 text-xs disabled:opacity-30"
                  >
                    ▲
                  </button>
                </form>
                <form action={moveGaleriaFoto.bind(null, foto.id, "down")}>
                  <button
                    type="submit"
                    disabled={i === fotos.length - 1}
                    className="rounded-lg border border-white/15 px-2 py-1 text-xs disabled:opacity-30"
                  >
                    ▼
                  </button>
                </form>
              </div>
              <form action={removeGaleriaFoto.bind(null, foto.id)}>
                <ConfirmSubmitButton
                  confirmMessage="Excluir esta foto?"
                  className="text-sm font-semibold text-coral hover:underline"
                >
                  Excluir
                </ConfirmSubmitButton>
              </form>
            </div>
          </div>
        ))}
      </div>

      <div className={cardClass}>
        <h2 className="mb-4 font-display text-lg font-extrabold">Adicionar foto</h2>
        <AddFotoForm />
      </div>
    </div>
  );
}
