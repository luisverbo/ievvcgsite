import { getProgramacaoAdmin } from "@/lib/admin/queries";
import { groupProgramacaoByDia } from "@/lib/format";
import { moveProgramacao, removeProgramacao } from "./actions";
import ProgramacaoForm from "./ProgramacaoForm";
import ConfirmSubmitButton from "../ConfirmSubmitButton";
import { cardClass } from "../ui";

export default async function ProgramacaoPage() {
  const itens = await getProgramacaoAdmin();
  const dias = groupProgramacaoByDia(itens);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-extrabold">Programação</h1>

      {dias.map((grupo) => (
        <div key={grupo.dia} className={cardClass}>
          <h2 className="mb-4 font-display text-lg font-extrabold">{grupo.dia}</h2>
          <div className="flex flex-col gap-3">
            {grupo.itens.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3 border-b border-white/10 pb-3">
                <div className="flex gap-1">
                  <form action={moveProgramacao.bind(null, item.id, grupo.dia, "up")}>
                    <button
                      type="submit"
                      disabled={i === 0}
                      className="rounded-lg border border-white/15 px-2 py-1 text-xs disabled:opacity-30"
                    >
                      ▲
                    </button>
                  </form>
                  <form action={moveProgramacao.bind(null, item.id, grupo.dia, "down")}>
                    <button
                      type="submit"
                      disabled={i === grupo.itens.length - 1}
                      className="rounded-lg border border-white/15 px-2 py-1 text-xs disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </form>
                </div>
                <div className="flex-1">
                  <ProgramacaoForm item={item} />
                </div>
                <form action={removeProgramacao.bind(null, item.id)}>
                  <ConfirmSubmitButton
                    confirmMessage="Excluir este item da programação?"
                    className="font-semibold text-coral hover:underline"
                  >
                    Excluir
                  </ConfirmSubmitButton>
                </form>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className={cardClass}>
        <h2 className="mb-4 font-display text-lg font-extrabold">Adicionar item</h2>
        <ProgramacaoForm defaultDia={dias[0]?.dia} />
      </div>
    </div>
  );
}
