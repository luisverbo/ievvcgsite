import { getFaqAdmin } from "@/lib/admin/queries";
import { moveFaq, removeFaq } from "./actions";
import FaqForm from "./FaqForm";
import ConfirmSubmitButton from "../ConfirmSubmitButton";
import { cardClass } from "../ui";

export default async function FaqPage() {
  const itens = await getFaqAdmin();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-extrabold">FAQ</h1>

      <div className="flex flex-col gap-4">
        {itens.map((item, i) => (
          <div key={item.id} className={cardClass}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex gap-1">
                <form action={moveFaq.bind(null, item.id, "up")}>
                  <button
                    type="submit"
                    disabled={i === 0}
                    className="rounded-lg border border-white/15 px-2.5 py-1 disabled:opacity-30"
                  >
                    ▲
                  </button>
                </form>
                <form action={moveFaq.bind(null, item.id, "down")}>
                  <button
                    type="submit"
                    disabled={i === itens.length - 1}
                    className="rounded-lg border border-white/15 px-2.5 py-1 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </form>
              </div>
              <form action={removeFaq.bind(null, item.id)}>
                <ConfirmSubmitButton
                  confirmMessage="Excluir esta pergunta?"
                  className="font-semibold text-coral hover:underline"
                >
                  Excluir
                </ConfirmSubmitButton>
              </form>
            </div>
            <FaqForm item={item} />
          </div>
        ))}
      </div>

      <div className={cardClass}>
        <h2 className="mb-4 font-display text-lg font-extrabold">Adicionar pergunta</h2>
        <FaqForm />
      </div>
    </div>
  );
}
