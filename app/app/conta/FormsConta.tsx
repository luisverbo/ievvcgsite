"use client";

import { useActionState } from "react";
import { salvarNome, trocarEmail, trocarSenha, type ContaState } from "./actions";
import { cardClass, inputClass, labelClass, fieldClass } from "@/components/painel/ui";

function Recado({ estado }: { estado: ContaState }) {
  if (estado?.error) {
    return (
      <p role="alert" className="mt-3 text-sm font-medium text-danger">
        {estado.error}
      </p>
    );
  }
  if (estado?.ok) {
    return (
      <p role="status" className="mt-3 text-sm font-medium text-ok">
        {estado.ok}
      </p>
    );
  }
  return null;
}

function Botao({ pendente, children }: { pendente: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pendente}
      className="mt-4 w-fit rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
    >
      {pendente ? "Salvando…" : children}
    </button>
  );
}

/* ------------------------------- seus dados ------------------------------- */

export function FormNome({ nomePessoa, nomeOrg }: { nomePessoa: string; nomeOrg: string }) {
  const [estado, acao, pendente] = useActionState<ContaState, FormData>(salvarNome, undefined);

  return (
    <form action={acao} className={cardClass}>
      <h2 className="text-lg font-bold">Seus dados</h2>
      <p className="mt-1 text-sm text-paper-dim">
        O nome da empresa é o que aparece no topo do seu painel.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="nome_pessoa">
            Seu nome
          </label>
          <input
            id="nome_pessoa"
            name="nome_pessoa"
            defaultValue={nomePessoa}
            placeholder="Como podemos te chamar"
            className={inputClass}
          />
        </div>
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="nome_org">
            Nome da empresa
          </label>
          <input
            id="nome_org"
            name="nome_org"
            defaultValue={nomeOrg}
            required
            className={inputClass}
          />
        </div>
      </div>
      <Recado estado={estado} />
      <Botao pendente={pendente}>Salvar dados</Botao>
    </form>
  );
}

/* --------------------------------- e-mail --------------------------------- */

export function FormEmail({ emailAtual }: { emailAtual: string }) {
  const [estado, acao, pendente] = useActionState<ContaState, FormData>(trocarEmail, undefined);

  return (
    <form action={acao} className={cardClass}>
      <h2 className="text-lg font-bold">E-mail de acesso</h2>
      <p className="mt-1 text-sm text-paper-dim">
        É com ele que você entra no painel e recebe os avisos de cobrança. Hoje:{" "}
        <b className="text-paper">{emailAtual}</b>
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="email">
            Novo e-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
          />
        </div>
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="senha_email">
            Sua senha atual
          </label>
          <input
            id="senha_email"
            name="senha_atual"
            type="password"
            required
            autoComplete="current-password"
            className={inputClass}
          />
        </div>
      </div>
      <p className="mt-3 text-xs text-paper-dim">
        Por segurança, mandamos um link de confirmação para o endereço novo — a troca só acontece
        quando você abrir esse link.
      </p>
      <Recado estado={estado} />
      <Botao pendente={pendente}>Trocar e-mail</Botao>
    </form>
  );
}

/* --------------------------------- senha ---------------------------------- */

export function FormSenha() {
  const [estado, acao, pendente] = useActionState<ContaState, FormData>(trocarSenha, undefined);

  return (
    <form action={acao} className={cardClass}>
      <h2 className="text-lg font-bold">Senha</h2>
      <p className="mt-1 text-sm text-paper-dim">
        Use pelo menos 8 caracteres. Se puder, misture letras e números.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="senha_atual">
            Senha atual
          </label>
          <input
            id="senha_atual"
            name="senha_atual"
            type="password"
            required
            autoComplete="current-password"
            className={inputClass}
          />
        </div>
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="senha_nova">
            Senha nova
          </label>
          <input
            id="senha_nova"
            name="senha_nova"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
          />
        </div>
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="senha_repetida">
            Repita a nova
          </label>
          <input
            id="senha_repetida"
            name="senha_repetida"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
          />
        </div>
      </div>
      <Recado estado={estado} />
      <Botao pendente={pendente}>Trocar senha</Botao>
    </form>
  );
}
