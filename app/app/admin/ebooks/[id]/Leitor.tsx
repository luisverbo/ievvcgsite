"use client";

import { useCallback, useEffect, useState } from "react";
import { gerarImagemPagina, marcarPronto, type EbookRow } from "../actions";

// Leitor estilo revista digital: uma página por vez com animação de virada
// (perspective + rotateY), navegação por setas/teclado e modo impressão
// (Baixar PDF = imprimir com cada página em uma folha).

const PROPORCAO: Record<string, string> = {
  a4: "210/297",
  mobile: "9/16",
  quadrado: "1/1",
};

/* eslint-disable @next/next/no-img-element */

export default function Leitor({ ebook }: { ebook: EbookRow }) {
  const [paginas, setPaginas] = useState(ebook.paginas);
  const [idx, setIdx] = useState(0);
  const [virando, setVirando] = useState<"frente" | "tras" | null>(null);
  const [gerandoImg, setGerandoImg] = useState<number | null>(null);
  const [lote, setLote] = useState<{ atual: number; total: number; falhas: number } | null>(null);
  const total = paginas.length;

  const semImagem = paginas.filter((p) => !p.imagem_url).length;

  // Gera todas as imagens que faltam, uma a uma, após a aprovação do texto.
  async function aprovarEGerarImagens() {
    const indices = paginas.map((p, i) => (p.imagem_url ? -1 : i)).filter((i) => i >= 0);
    let falhas = 0;
    for (let n = 0; n < indices.length; n++) {
      const i = indices[n];
      setLote({ atual: n + 1, total: indices.length, falhas });
      let res = await gerarImagemPagina(ebook.id, i);
      if (res.error) {
        res = await gerarImagemPagina(ebook.id, i); // segunda tentativa
        if (res.error) falhas++;
      }
      if (res.url) {
        const url = res.url;
        setPaginas((ps) => ps.map((p, j) => (j === i ? { ...p, imagem_url: url } : p)));
      }
      setLote({ atual: n + 1, total: indices.length, falhas });
    }
    await marcarPronto(ebook.id);
    setLote(null);
  }

  const irPara = useCallback(
    (novo: number, direcao: "frente" | "tras") => {
      if (novo < 0 || novo >= total) return;
      setVirando(direcao);
      setTimeout(() => {
        setIdx(novo);
        setVirando(null);
      }, 220);
    },
    [total],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") irPara(idx + 1, "frente");
      if (e.key === "ArrowLeft") irPara(idx - 1, "tras");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, irPara]);

  async function regerarImagem(i: number) {
    setGerandoImg(i);
    const res = await gerarImagemPagina(ebook.id, i);
    if (res.url) {
      setPaginas((ps) => ps.map((p, j) => (j === i ? { ...p, imagem_url: res.url } : p)));
    }
    setGerandoImg(null);
  }

  const aspecto = PROPORCAO[ebook.formato] ?? PROPORCAO.a4;
  const pag = paginas[idx];
  const ehCapa = pag?.tipo === "capa";

  return (
    <div>
      {/* ---------- aprovação do texto → geração das imagens ---------- */}
      {lote ? (
        <div className="ebook-no-print mb-4 flex flex-col gap-2 rounded-xl border border-brand-2/40 bg-brand/10 p-4">
          <div className="flex items-baseline justify-between">
            <p className="font-bold">🎨 Gerando as imagens…</p>
            <span className="text-sm text-paper-dim">
              {lote.atual} de {lote.total}
              {lote.falhas > 0 && ` · ${lote.falhas} falhou`}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-brand-2 transition-all duration-500"
              style={{ width: `${Math.round((lote.atual / lote.total) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-paper-dim">
            15–60s por imagem. Deixe esta aba aberta — as páginas vão ganhando imagem em tempo real.
          </p>
        </div>
      ) : semImagem > 0 ? (
        <div className="ebook-no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warn/40 bg-warn/10 p-4">
          <div>
            <p className="font-bold">📝 Revise o texto antes de gastar com imagens</p>
            <p className="text-sm text-paper-dim">
              Navegue pelas {total} páginas abaixo. Gostou do conteúdo? Aprove para gerar as{" "}
              {semImagem} imagens (~US${(semImagem * 0.07).toFixed(2)} na sua conta OpenAI). Não
              gostou? Exclua o ebook e gere outro texto — isso custa centavos.
            </p>
          </div>
          <button
            onClick={aprovarEGerarImagens}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2"
          >
            ✅ Aprovar texto e gerar {semImagem} imagens
          </button>
        </div>
      ) : null}

      {/* ---------- controles ---------- */}
      <div className="ebook-no-print mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => irPara(idx - 1, "tras")}
            disabled={idx === 0}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-lg transition hover:border-brand-2 disabled:opacity-30"
            aria-label="Página anterior"
          >
            ‹
          </button>
          <span className="text-sm tabular-nums text-paper-dim">
            {idx + 1} / {total}
          </span>
          <button
            onClick={() => irPara(idx + 1, "frente")}
            disabled={idx === total - 1}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-lg transition hover:border-brand-2 disabled:opacity-30"
            aria-label="Próxima página"
          >
            ›
          </button>
        </div>
        <div className="flex items-center gap-2">
          {!pag?.imagem_url && (
            <button
              onClick={() => regerarImagem(idx)}
              disabled={gerandoImg !== null}
              className="rounded-lg border border-warn/50 px-3 py-1.5 text-sm font-bold text-warn transition hover:bg-warn/10 disabled:opacity-50"
            >
              {gerandoImg === idx ? "Gerando imagem…" : "🎨 Gerar imagem desta página"}
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-brand px-4 py-1.5 text-sm font-bold text-white transition hover:bg-brand-2"
          >
            ⬇️ Baixar PDF
          </button>
        </div>
      </div>

      {/* ---------- página atual (leitor) ---------- */}
      <div className="ebook-no-print flex justify-center" style={{ perspective: 2200 }}>
        <div
          key={idx}
          className={`ebook-pagina ${virando === "frente" ? "ebook-saindo-frente" : virando === "tras" ? "ebook-saindo-tras" : "ebook-entrando"}`}
          style={{
            aspectRatio: aspecto,
            width: "100%",
            maxWidth: ebook.formato === "mobile" ? 420 : ebook.formato === "quadrado" ? 560 : 640,
          }}
        >
          <Pagina pag={pag} ehCapa={ehCapa} numero={idx} total={total} titulo={ebook.titulo} />
        </div>
      </div>

      {/* ---------- miniaturas ---------- */}
      <div className="ebook-no-print mt-4 flex gap-2 overflow-x-auto pb-2">
        {paginas.map((p, i) => (
          <button
            key={i}
            onClick={() => irPara(i, i > idx ? "frente" : "tras")}
            className={`relative h-20 flex-none overflow-hidden rounded-md border-2 transition ${
              i === idx ? "border-brand-2" : "border-white/10 hover:border-white/30"
            }`}
            style={{ aspectRatio: aspecto }}
            title={p.titulo}
          >
            {p.imagem_url ? (
              <img src={p.imagem_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-ink-3 text-[10px] text-paper-dim">
                {i + 1}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ---------- versão de impressão: todas as páginas ---------- */}
      <div className="ebook-print-area hidden">
        {paginas.map((p, i) => (
          <div key={i} className="ebook-print-page" style={{ aspectRatio: aspecto }}>
            <Pagina pag={p} ehCapa={p.tipo === "capa"} numero={i} total={total} titulo={ebook.titulo} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Pagina({
  pag,
  ehCapa,
  numero,
  total,
  titulo,
}: {
  pag: EbookRow["paginas"][number];
  ehCapa: boolean;
  numero: number;
  total: number;
  titulo: string;
}) {
  if (!pag) return null;

  if (ehCapa) {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-xl bg-ink-3 shadow-2xl">
        {pag.imagem_url && (
          <img src={pag.imagem_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />
        <div className="absolute inset-x-0 bottom-0 p-8 text-white">
          <div className="mb-2 h-1 w-14 rounded bg-white/80" />
          <h2 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">
            {pag.titulo}
          </h2>
          {pag.texto && <p className="mt-3 text-sm text-white/85 sm:text-base">{pag.texto}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-[#faf8f4] text-[#1c1a17] shadow-2xl">
      <div className="relative h-[42%] flex-none bg-[#e8e4dc]">
        {pag.imagem_url ? (
          <img src={pag.imagem_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[#8a8478]">
            imagem ainda não gerada
          </div>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-6 sm:p-8">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#a09883]">
          <span className="h-px w-6 bg-[#a09883]" />
          {titulo}
        </div>
        <h3 className="font-display text-xl font-extrabold leading-snug sm:text-2xl">{pag.titulo}</h3>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto whitespace-pre-line text-[13px] leading-relaxed text-[#3d3a33] sm:text-sm">
          {pag.texto}
        </div>
        <div className="mt-3 flex flex-none items-center justify-between text-[10px] text-[#a09883]">
          <span>{titulo}</span>
          <span>
            {numero} / {total - 1}
          </span>
        </div>
      </div>
    </div>
  );
}
