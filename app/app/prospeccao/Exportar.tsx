"use client";

import { useState } from "react";

/*
 * O botão de exportar, com escolha.
 *
 * Antes era um link só, que baixava tudo com todas as colunas — e "tudo" quase
 * nunca é o que a pessoa quer naquele minuto. Quem vai importar numa
 * ferramenta de disparo precisa de uma coluna de números; quem vai LIGAR
 * precisa de nome e telefone; quem vai estudar a região quer o resto.
 *
 * O painelzinho abre com <details>, sem biblioteca e sem JS de menu: fecha
 * clicando fora não é essencial aqui, e um <a download> de verdade lá dentro
 * baixa o arquivo sem nenhum truque de blob.
 */

type Formato = "zap" | "contatos" | "completo";

const OPCOES: { valor: Formato; titulo: string; texto: string }[] = [
  {
    valor: "zap",
    titulo: "Só WhatsApp",
    texto: "Duas colunas: o número (5511…) e o nome da empresa. É o formato que ferramenta de importação espera. Sai só quem tem WhatsApp.",
  },
  {
    valor: "contatos",
    titulo: "Contatos",
    texto: "Empresa, telefone, WhatsApp, link de conversa, endereço, etiqueta e situação. Para quem vai ligar ou chamar na mão.",
  },
  {
    valor: "completo",
    titulo: "Tudo",
    texto: "Todas as colunas: avaliações do Google, nota, categoria, site, Instagram e o link do Maps.",
  },
];

export default function Exportar({
  /* Os filtros ligados na tela agora — viram os mesmos parâmetros na URL. */
  filtros,
  /* Quantas empresas o filtro atual está mostrando, para o botão não mentir. */
  quantidade,
  comFiltro,
}: {
  filtros: Record<string, string | undefined>;
  quantidade: number;
  comFiltro: boolean;
}) {
  const [formato, setFormato] = useState<Formato>("completo");
  const [soZap, setSoZap] = useState(false);
  const [respeitarFiltro, setRespeitarFiltro] = useState(true);

  const params = new URLSearchParams({ formato });
  if (soZap) params.set("so_zap", "1");
  if (comFiltro && respeitarFiltro) {
    for (const [k, v] of Object.entries(filtros)) if (v) params.set(k, v);
  }

  const zapForcado = formato === "zap";

  return (
    <details className="group relative">
      <summary className="cursor-pointer list-none rounded-lg border border-white/15 px-3 py-1.5 text-sm font-bold text-paper-dim transition hover:border-ok/50 hover:text-ok [&::-webkit-details-marker]:hidden">
        ⬇️ Exportar planilha
      </summary>

      <div className="absolute right-0 z-30 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border border-white/15 bg-ink-2 p-4 shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-wide text-paper-dim">
          O que vai na planilha
        </p>

        <div className="mt-2 flex flex-col gap-1.5">
          {OPCOES.map((o) => (
            <label
              key={o.valor}
              className={`flex cursor-pointer gap-2.5 rounded-lg border p-2.5 transition ${
                formato === o.valor
                  ? "border-brand-2/60 bg-brand/10"
                  : "border-white/10 hover:border-white/25"
              }`}
            >
              <input
                type="radio"
                name="formato"
                checked={formato === o.valor}
                onChange={() => setFormato(o.valor)}
                className="mt-1 flex-none accent-current"
              />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-paper">{o.titulo}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-paper-dim">
                  {o.texto}
                </span>
              </span>
            </label>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3">
          <label
            className={`flex items-start gap-2.5 text-sm ${
              zapForcado ? "cursor-default opacity-60" : "cursor-pointer"
            }`}
          >
            <input
              type="checkbox"
              checked={soZap || zapForcado}
              disabled={zapForcado}
              onChange={(e) => setSoZap(e.target.checked)}
              className="mt-0.5 flex-none accent-current"
            />
            <span className="min-w-0">
              <span className="font-bold text-paper">Só empresas com WhatsApp</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-paper-dim">
                {zapForcado
                  ? "Já está incluído neste formato."
                  : "Deixa de fora quem só tem telefone fixo — nesses o número não abre conversa."}
              </span>
            </span>
          </label>

          {comFiltro && (
            <label className="flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={respeitarFiltro}
                onChange={(e) => setRespeitarFiltro(e.target.checked)}
                className="mt-0.5 flex-none accent-current"
              />
              <span className="min-w-0">
                <span className="font-bold text-paper">
                  Só o que está filtrado na tela ({quantidade})
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-paper-dim">
                  Desmarque para baixar a lista inteira.
                </span>
              </span>
            </label>
          )}
        </div>

        <a
          href={`/app/prospeccao/exportar?${params.toString()}`}
          download
          className="mt-4 flex w-full items-center justify-center rounded-lg bg-ok px-4 py-2.5 text-sm font-bold text-ink transition hover:opacity-90"
        >
          Baixar planilha (.csv)
        </a>
        <p className="mt-2 text-[11px] text-paper-dim">
          Abre direto no Excel e no Google Sheets.
        </p>
      </div>
    </details>
  );
}
