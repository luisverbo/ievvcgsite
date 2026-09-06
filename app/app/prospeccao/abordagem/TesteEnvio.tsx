"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { enviarTesteZap, type EstadoAbordagem } from "./actions";
import { inputClass, labelClass } from "@/components/painel/ui";

/*
 * Testar o envio: um número, um texto, e o veredito de verdade.
 *
 * "Conectado" na tela é um status guardado no banco — não é prova de que o
 * WhatsApp manda. Esta mensagem passa pelo mesmo caminho de uma abordagem
 * (fila → agente → WhatsApp Web) e volta dizendo o que aconteceu, com a
 * frase que veio da ponta quando falha.
 *
 * Enquanto o teste está na fila a tela se atualiza sozinha a cada 5s: quem
 * clicou está olhando, e o resultado chega em segundos.
 */

export type ResultadoTeste = {
  telefone: string;
  status: "pendente" | "enviada" | "erro" | "cancelada" | "sem_whatsapp";
  erro: string | null;
  criadoEm: string;
  enviadaEm: string | null;
} | null;

export default function TesteEnvio({
  ultimo,
  linhas,
  agenteOnline,
}: {
  ultimo: ResultadoTeste;
  linhas: { id: string; nome: string; conectada: boolean }[];
  /* Nenhum agente dando sinal: o teste ficaria esperando para sempre. */
  agenteOnline: boolean;
}) {
  const router = useRouter();
  const [estado, enviar, enviando] = useActionState<EstadoAbordagem, FormData>(
    enviarTesteZap,
    undefined,
  );

  const esperando = ultimo?.status === "pendente";
  useEffect(() => {
    if (!esperando) return;
    const id = window.setInterval(() => {
      if (!document.hidden) router.refresh();
    }, 5000);
    return () => window.clearInterval(id);
  }, [esperando, router]);

  return (
    <details className="rounded-xl border border-white/10 bg-ink-2 p-4">
      <summary className="cursor-pointer list-none text-sm font-bold text-paper-dim transition hover:text-paper [&::-webkit-details-marker]:hidden">
        🧪 Testar o envio — mandar uma mensagem para um número seu
      </summary>

      <p className="mt-3 text-xs text-paper-dim">
        Manda por este mesmo caminho que as abordagens usam. Se chegar, o envio está funcionando;
        se falhar, aparece aqui o motivo que veio do WhatsApp. Não conta no limite do dia e fura a
        fila — sai em segundos.
      </p>

      {!agenteOnline && (
        <p className="mt-3 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
          ⚠️ Nenhum agente deu sinal nos últimos 15 minutos. O teste vai ficar esperando na fila até
          o agente voltar — confira em Prospecção › Meu agente.
        </p>
      )}

      <form action={enviar} className="mt-3 flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          <div>
            <label className={labelClass} htmlFor="teste_telefone">
              Número (com DDD)
            </label>
            <input
              id="teste_telefone"
              name="telefone"
              defaultValue={ultimo?.telefone ?? ""}
              placeholder="(21) 99999-8888"
              className={`${inputClass} mt-1 w-48`}
            />
          </div>
          {linhas.length > 1 && (
            <div>
              <label className={labelClass} htmlFor="teste_linha">
                Por qual número sai
              </label>
              <select id="teste_linha" name="linha" defaultValue="" className={`${inputClass} mt-1 w-56`}>
                <option value="">Qualquer um conectado</option>
                {linhas.map((l) => (
                  <option key={l.id} value={l.id} disabled={!l.conectada}>
                    {l.nome}
                    {l.conectada ? "" : " (desconectado)"}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className={labelClass} htmlFor="teste_texto">
            Mensagem
          </label>
          <textarea
            id="teste_texto"
            name="texto"
            defaultValue="Teste do meu agente 🤖 — se você recebeu esta mensagem, o envio está funcionando."
            rows={2}
            className={`${inputClass} mt-1 w-full resize-y text-xs`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={enviando}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
          >
            {enviando ? "Enfileirando…" : "Enviar teste"}
          </button>
          {estado?.error && <p className="text-sm text-danger">{estado.error}</p>}
          {estado?.ok && <p className="text-sm text-ok">✅ {estado.ok}</p>}
        </div>
      </form>

      {/* --------------------------- o resultado --------------------------- */}
      {ultimo && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2.5 text-xs ${
            ultimo.status === "enviada"
              ? "border-ok/40 bg-ok/10 text-ok"
              : ultimo.status === "pendente"
                ? "border-brand-2/40 bg-brand/10 text-brand-2"
                : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {ultimo.status === "enviada" && (
            <>
              <b>✓ Enviada para {ultimo.telefone}</b>
              {ultimo.enviadaEm && (
                <span className="text-paper-dim">
                  {" "}
                  às{" "}
                  {new Date(ultimo.enviadaEm).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
              <span className="mt-1 block text-paper-dim">
                O envio está funcionando. Se a mensagem não apareceu no celular, confira o número.
              </span>
            </>
          )}
          {ultimo.status === "pendente" && (
            <>
              <b>⏳ Na fila…</b>
              <span className="mt-1 block text-paper-dim">
                O agente pega em até 20 segundos. Esta caixa se atualiza sozinha.
              </span>
            </>
          )}
          {ultimo.status === "sem_whatsapp" && (
            <>
              <b>✕ Este número não tem WhatsApp</b>
              <span className="mt-1 block text-paper-dim">
                O envio funcionou — quem não tem conta é o número testado. Tente com outro.
              </span>
            </>
          )}
          {(ultimo.status === "erro" || ultimo.status === "cancelada") && (
            <>
              <b>✕ Não saiu</b>
              {ultimo.erro && <span className="mt-1 block">{ultimo.erro}</span>}
              <span className="mt-1 block text-paper-dim">
                Se diz que a sessão caiu, reconecte a linha e leia o QR de novo.
              </span>
            </>
          )}
        </div>
      )}
    </details>
  );
}
