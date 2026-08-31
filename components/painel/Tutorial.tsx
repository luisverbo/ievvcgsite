import { PASSOS_TUTORIAL } from "@/lib/painel/tutorial";

/*
 * Os passos numerados da instalação.
 *
 * Um componente só, usado na página "Comece aqui" e na tela do agente, para
 * o texto nunca divergir entre as duas.
 *
 * O botão de baixar nasce DENTRO do passo 1 e não no topo da tela: quem lê
 * um passo a passo lê de cima para baixo, e um botão solto acima faz a pessoa
 * baixar antes de saber o que fazer com o arquivo.
 */
export default function Tutorial({
  /* Off em telas que já têm o botão de baixar logo acima — dois botões
     iguais na mesma tela fazem a pessoa parar para escolher qual clicar. */
  comDownload = true,
}: {
  comDownload?: boolean;
}) {
  return (
    <ol className="flex flex-col gap-3">
      {PASSOS_TUTORIAL.map((p, i) => (
        <li
          key={p.titulo}
          className={`flex gap-4 rounded-xl border p-4 sm:p-5 ${
            p.destaque ? "border-warn/40 bg-warn/10" : "border-white/10 bg-ink-2"
          }`}
        >
          <span
            className={`flex h-9 w-9 flex-none items-center justify-center rounded-full font-display text-base font-extrabold ${
              p.destaque ? "bg-warn/20 text-warn" : "bg-brand/20 text-brand-2"
            }`}
          >
            {i + 1}
          </span>
          <div className="min-w-0">
            <h3 className={`font-display text-base font-extrabold ${p.destaque ? "text-warn" : "text-paper"}`}>
              {p.titulo}
            </h3>
            <p className="mt-1 text-sm text-paper">{p.texto}</p>

            {p.download && comDownload && (
              <div className="mt-3">
                <a
                  href="/app/prospeccao/agente/baixar"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand/25 transition hover:-translate-y-0.5 hover:bg-brand-2"
                >
                  ⬇ Baixar o agente (.zip)
                </a>
                <p className="mt-1.5 text-xs text-paper-dim">
                  Serve para Windows e para Mac — o instalador certo já vai lá dentro.
                </p>
              </div>
            )}

            {p.detalhe && <p className="mt-2 text-xs text-paper-dim">💡 {p.detalhe}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
