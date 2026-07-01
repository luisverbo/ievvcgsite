import { getArtistasAdmin } from "@/lib/admin/queries";
import { moveArtista, removeArtista } from "./actions";
import ArtistaForm from "./ArtistaForm";
import ConfirmSubmitButton from "../ConfirmSubmitButton";
import { cardClass } from "../ui";

export default async function LineupPage() {
  const artistas = await getArtistasAdmin();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-extrabold">Line-up</h1>

      <div className="flex flex-col gap-4">
        {artistas.map((artista, i) => (
          <div key={artista.id} className={cardClass}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex gap-1">
                <form action={moveArtista.bind(null, artista.id, "up")}>
                  <button
                    type="submit"
                    disabled={i === 0}
                    className="rounded-lg border border-white/15 px-2.5 py-1 disabled:opacity-30"
                  >
                    ▲
                  </button>
                </form>
                <form action={moveArtista.bind(null, artista.id, "down")}>
                  <button
                    type="submit"
                    disabled={i === artistas.length - 1}
                    className="rounded-lg border border-white/15 px-2.5 py-1 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </form>
              </div>
              <form action={removeArtista.bind(null, artista.id)}>
                <ConfirmSubmitButton
                  confirmMessage={`Excluir "${artista.nome}"?`}
                  className="font-semibold text-coral hover:underline"
                >
                  Excluir
                </ConfirmSubmitButton>
              </form>
            </div>
            <ArtistaForm artista={artista} />
          </div>
        ))}
      </div>

      <div className={cardClass}>
        <h2 className="mb-4 font-display text-lg font-extrabold">Adicionar artista</h2>
        <ArtistaForm />
      </div>
    </div>
  );
}
