"use client";

import { useActionState } from "react";
import { salvarAvisosZap, testarAvisoZap, type AvisosState } from "./actions";
import { inputClass, labelClass, cardClass } from "@/components/painel/ui";

/*
 * O card dos avisos no WhatsApp do dono.
 *
 * Quem entrega é o agente da SUA organização (a VPS), pelo mesmo caminho do
 * resumo diário — então precisa do seu WhatsApp conectado nele. O botão de
 * teste existe para conferir isso sem esperar uma venda acontecer.
 */
export default function AvisosZap({
  telefone,
  agenteOnline,
}: {
  telefone: string;
  /* O agente da sua org deu sinal nos últimos 15 min? Sem ele, nada chega. */
  agenteOnline: boolean;
}) {
  const [estado, salvar, salvando] = useActionState<AvisosState, FormData>(salvarAvisosZap, undefined);
  const [teste, testar, testando] = useActionState<AvisosState, FormData>(testarAvisoZap, undefined);

  return (
    <div className={cardClass}>
      <h2 className="text-lg font-bold">📲 Avisos no seu WhatsApp</h2>
      <p className="mt-1 text-sm text-paper-dim">
        Quando alguém <b className="text-paper">entrar no teste grátis</b> ou{" "}
        <b className="text-paper">assinar um plano</b>, você recebe uma mensagem neste número.
        Quem manda é o seu agente (o da VPS), do seu próprio WhatsApp — sem API paga. O e-mail do
        admin recebe uma cópia, se o Resend estiver configurado.
      </p>

      {!agenteOnline && (
        <p className="mt-3 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
          ⚠️ Seu agente não deu sinal nos últimos 15 minutos. Os avisos ficam na fila e saem quando
          ele voltar — confira em Prospecção › Meu agente.
        </p>
      )}

      <form action={salvar} className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className={labelClass} htmlFor="aviso_zap">
            Número que recebe (celular com DDD)
          </label>
          <input
            id="aviso_zap"
            name="telefone"
            defaultValue={telefone}
            placeholder="(21) 99999-8888"
            className={`${inputClass} mt-1 w-56`}
          />
        </div>
        <button
          type="submit"
          disabled={salvando}
          className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
        >
          {salvando ? "Salvando…" : "Salvar"}
        </button>
        {estado?.error && <p className="w-full text-sm text-danger">{estado.error}</p>}
        {estado?.ok && <p className="w-full text-sm text-ok">✅ {estado.ok}</p>}
      </form>

      {telefone && (
        <form action={testar} className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={testando}
            className="rounded-lg border border-white/15 px-4 py-2 text-xs font-bold text-paper-dim transition hover:border-brand-2 hover:text-brand-2 disabled:opacity-60"
          >
            {testando ? "Enfileirando…" : "Mandar um aviso de teste agora"}
          </button>
          {teste?.error && <p className="text-sm text-danger">{teste.error}</p>}
          {teste?.ok && <p className="text-sm text-ok">✅ {teste.ok}</p>}
        </form>
      )}
    </div>
  );
}
