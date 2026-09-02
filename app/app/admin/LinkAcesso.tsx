"use client";

import { useActionState, useState } from "react";
import { gerarLinkAcesso, type LinkAcessoState } from "./actions";
import { cardClass, inputClass } from "@/components/painel/ui";

/*
 * "O cliente pagou e não consegue entrar."
 *
 * Esta é a tela que resolve isso em trinta segundos, sem depender de e-mail
 * nenhum: o link sai aqui e você manda pelo WhatsApp, que é onde o cliente
 * responde de verdade.
 *
 * O botão de copiar existe porque a alternativa é selecionar com o dedo um
 * endereço de 200 caracteres no celular — e um caractere a menos vira um
 * link quebrado na mão de quem acabou de pagar.
 */
export default function LinkAcesso({ emails }: { emails: string[] }) {
  const [estado, acao, pendente] = useActionState<LinkAcessoState, FormData>(
    gerarLinkAcesso,
    undefined,
  );
  const [copiado, setCopiado] = useState<"link" | "recado" | null>(null);

  async function copiar(texto: string, qual: "link" | "recado") {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(qual);
      window.setTimeout(() => setCopiado(null), 2000);
    } catch {
      // Sem permissão de área de transferência: o texto está na tela, dá para
      // selecionar na mão. Melhor não fingir que copiou.
      setCopiado(null);
    }
  }

  return (
    <div className={cardClass}>
      <h2 className="text-lg font-bold">🔑 Dar acesso a um cliente</h2>
      <p className="mt-2 text-sm text-paper-dim">
        Gera na hora um link para o cliente <b className="text-paper">criar a senha dele e entrar</b>
        . Use quando ele assinou e não conseguiu acessar — esqueceu a senha, errou o e-mail no
        cadastro ou o e-mail caiu no spam. Se ainda não houver conta com esse e-mail, ela é criada
        aqui mesmo.
      </p>

      <form action={acao} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          name="email"
          type="email"
          required
          list="emails-das-contas"
          placeholder="email@docliente.com.br"
          autoComplete="off"
          defaultValue={estado?.email}
          className={`${inputClass} min-w-0 flex-1 font-mono text-sm`}
        />
        {/* As contas que já existem, para não errar o e-mail digitando. */}
        <datalist id="emails-das-contas">
          {emails.map((e) => (
            <option key={e} value={e} />
          ))}
        </datalist>
        <button
          type="submit"
          disabled={pendente}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
        >
          {pendente ? "Gerando…" : "Gerar link"}
        </button>
      </form>

      {estado?.error && (
        <p role="alert" className="mt-3 text-xs font-medium text-danger">
          {estado.error}
        </p>
      )}

      {estado?.link && (
        <div className="mt-4 rounded-xl border border-ok/40 bg-ok/10 p-4">
          <p className="text-sm font-bold text-ok">✓ {estado.ok}</p>

          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-paper-dim">O link</p>
          <p className="mt-1 break-all rounded-lg border border-white/10 bg-black/30 p-2.5 font-mono text-[11px] text-paper">
            {estado.link}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copiar(estado.link!, "link")}
              className="rounded-lg bg-ok px-4 py-2 text-xs font-bold text-ink transition hover:opacity-90"
            >
              {copiado === "link" ? "✓ Copiado" : "Copiar só o link"}
            </button>
            <button
              type="button"
              onClick={() => copiar(estado.recado!, "recado")}
              className="rounded-lg border border-white/20 px-4 py-2 text-xs font-bold text-paper transition hover:border-ok hover:text-ok"
            >
              {copiado === "recado" ? "✓ Copiado" : "Copiar a mensagem pronta"}
            </button>
          </div>

          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-bold text-paper-dim">
              Ver a mensagem pronta para o WhatsApp
            </summary>
            <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-white/10 bg-black/30 p-2.5 text-[11px] text-paper-dim">
              {estado.recado}
            </pre>
          </details>

          <p className="mt-3 text-[11px] text-paper-dim">
            ⚠️ Este link entra na conta do cliente — mande só para ele, no particular. Vale por cerca
            de 1 hora e serve uma vez só; depois disso é só gerar outro.
          </p>
        </div>
      )}
    </div>
  );
}
