"use client";

import { useActionState, useState } from "react";
import { criarToken, type TokenState } from "./actions";
import { inputClass } from "@/components/painel/ui";

export default function NovoToken({ url }: { url: string }) {
  const [estado, acao, pendente] = useActionState<TokenState, FormData>(criarToken, undefined);
  const [copiado, setCopiado] = useState("");

  const copiar = async (texto: string, qual: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(qual);
      window.setTimeout(() => setCopiado(""), 2500);
    } catch {
      // sem permissão de área de transferência: o texto está na tela
    }
  };

  if (estado?.token) {
    const env = `PAGINAPRO_URL=${url}\nPAGINAPRO_TOKEN=${estado.token}`;
    return (
      <div className="rounded-xl border border-ok/40 bg-ok/5 p-5">
        <h3 className="text-sm font-bold text-ok">✓ Agente criado</h3>
        <p className="mt-1 text-sm text-paper-dim">
          Copie agora: por segurança, este código <b className="text-paper">não aparece de novo</b>.
          Se perder, é só criar outro.
        </p>

        <pre className="mt-3 overflow-x-auto rounded-lg bg-ink px-4 py-3 font-mono text-xs text-paper">
          {env}
        </pre>

        <button
          type="button"
          onClick={() => copiar(env, "env")}
          className="mt-2 rounded-lg bg-ok/20 px-4 py-2 text-sm font-bold text-ok transition hover:bg-ok/30"
        >
          {copiado === "env" ? "✓ Copiado" : "Copiar as duas linhas"}
        </button>

        <p className="mt-3 text-xs text-paper-dim">
          Cole isso no arquivo <code className="text-paper">agente/.env</code>, no passo 4 abaixo.
        </p>
      </div>
    );
  }

  return (
    <form action={acao} className="rounded-xl border border-white/10 bg-ink-2 p-5">
      <h3 className="text-sm font-bold text-paper">Criar o código do seu agente</h3>
      <p className="mt-1 text-xs text-paper-dim">
        É ele que liga o programa no seu computador à sua conta. Ninguém mais tem acesso à sua fila.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          name="nome"
          placeholder="Meu computador"
          maxLength={60}
          className={`${inputClass} min-w-0 flex-1 text-sm`}
        />
        <button
          type="submit"
          disabled={pendente}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
        >
          {pendente ? "Criando…" : "Criar código"}
        </button>
      </div>
      {estado?.error && (
        <p role="alert" className="mt-2 text-xs font-medium text-danger">
          {estado.error}
        </p>
      )}
    </form>
  );
}
