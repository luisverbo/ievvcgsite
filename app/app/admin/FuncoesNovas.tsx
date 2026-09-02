import { FUNCOES_NOVAS, estadoDasFuncoes } from "@/lib/painel/flags";
import { alternarFuncao } from "./actions";
import { cardClass } from "@/components/painel/ui";

/*
 * O quadro de interruptores das funções novas.
 *
 * Cada função de peso lançada daqui para frente aparece aqui com o seu
 * botão. Desligou, sumiu para todos os clientes na hora — sem deploy.
 * As marcadas "em construção" já têm o interruptor pronto; ele passa a
 * valer no dia em que a função entrar no ar.
 */
export default async function FuncoesNovas() {
  const estado = await estadoDasFuncoes();

  const total = Object.keys(FUNCOES_NOVAS).length;
  const ligadas = Object.keys(FUNCOES_NOVAS).filter((n) => estado[n]).length;

  /*
   * Recolhido: é um freio de mão, não um painel de bordo. Você mexe aqui
   * quando quer desligar alguma coisa — e uma lista de dez itens aberta
   * empurra para baixo tudo que você veio fazer no Admin.
   */
  return (
    <details className={cardClass}>
      <summary className="flex cursor-pointer flex-wrap items-center gap-3 [&::-webkit-details-marker]:hidden">
        <h2 className="text-lg font-bold">🎚️ Funções novas</h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
            ligadas === total ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn"
          }`}
        >
          {ligadas} de {total} ligadas
        </span>
        <span className="ml-auto text-xs font-bold text-paper-dim">abrir ▾</span>
      </summary>
      <p className="mt-3 text-sm text-paper-dim">
        Seu freio de mão: qualquer função aqui pode ser desligada para{" "}
        <b className="text-paper">todos os clientes, na hora</b>, sem depender de ninguém. Ligada é
        o padrão — desligue o que não te agradar em produção.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {Object.entries(FUNCOES_NOVAS).map(([nome, f]) => {
          const ligada = estado[nome];
          return (
            <div
              key={nome}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/10 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-paper">
                  {f.rotulo}{" "}
                  {!f.pronta && (
                    <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-paper-dim">
                      em construção
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-paper-dim">{f.descricao}</p>
              </div>
              <form action={alternarFuncao.bind(null, nome, !ligada)}>
                <button
                  type="submit"
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                    ligada
                      ? "bg-ok/15 text-ok hover:bg-danger/15 hover:text-danger"
                      : "border border-white/15 text-paper-dim hover:border-ok hover:text-ok"
                  }`}
                  title={ligada ? "Clique para desligar para todos" : "Clique para ligar"}
                >
                  {ligada ? "● ligada" : "○ desligada"}
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </details>
  );
}
