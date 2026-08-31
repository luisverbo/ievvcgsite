"use client";

import { useState } from "react";
import { MODELOS_PRONTOS } from "@/lib/prospeccao/modelos";

/*
 * Os modelos prontos, acima da caixa de texto da mensagem.
 *
 * A tela em branco é onde o cliente novo trava: assina, abre a abordagem,
 * vê uma caixa vazia e adia — e quem adia o primeiro envio não volta. Um
 * clique aqui preenche a caixa com um texto que já segue as regras da casa,
 * e ele ajusta as palavras dali.
 *
 * Escreve direto no <textarea> por id em vez de controlar o valor no React:
 * a caixa continua sendo um campo comum do formulário (defaultValue), sem
 * virar estado controlado só por causa deste atalho.
 */
export default function ModelosProntos({ alvo }: { alvo: string }) {
  const [usado, setUsado] = useState<string | null>(null);

  function aplicar(chave: string, texto: string) {
    const campo = document.getElementById(alvo) as HTMLTextAreaElement | null;
    if (!campo) return;
    if (campo.value.trim() && !window.confirm("Isto substitui o texto atual. Continuar?")) return;
    campo.value = texto;
    campo.focus();
    setUsado(chave);
  }

  return (
    <details className="mb-3 rounded-xl border border-brand-2/30 bg-brand/10 p-3">
      <summary className="cursor-pointer list-none text-sm font-bold text-paper transition hover:text-brand-2 [&::-webkit-details-marker]:hidden">
        ✨ Modelos prontos — comece de um texto que já funciona
      </summary>
      <p className="mt-2 text-xs text-paper-dim">
        Clique no seu tipo de venda e a caixa abaixo é preenchida. Todos seguem as regras que
        protegem o seu número: sem link, sem preço, com variação de texto e pedindo permissão no
        fim. Depois é só ajustar as palavras do seu jeito.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {MODELOS_PRONTOS.map((m) => (
          <button
            key={m.chave}
            type="button"
            onClick={() => aplicar(m.chave, m.texto)}
            title={`Para ${m.publico}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              usado === m.chave
                ? "border-ok/60 bg-ok/15 text-ok"
                : "border-white/15 text-paper-dim hover:border-brand-2 hover:text-brand-2"
            }`}
          >
            {usado === m.chave ? "✓ aplicado" : m.rotulo}
          </button>
        ))}
      </div>
    </details>
  );
}
