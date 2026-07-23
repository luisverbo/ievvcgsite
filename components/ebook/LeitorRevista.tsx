"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gerarImagemPagina, marcarPronto, type EbookRow } from "@/app/app/admin/ebooks/actions";
import type { PaginaEbook } from "@/lib/ebooks/openai";

/*
 * Leitor em formato de REVISTA ABERTA: duas páginas lado a lado sobre uma
 * lombada, com virada de página em 3D que segue o arrasto do mouse/dedo.
 * Layouts editoriais por página: capa, classico, lateral, full e citacao.
 */

/* eslint-disable @next/next/no-img-element */

const PROPORCAO: Record<string, [number, number]> = {
  a4: [210, 297],
  mobile: [9, 16],
  quadrado: [1, 1],
};

type Turn = { dir: "frente" | "tras"; deg: number; soltando: boolean } | null;

export default function LeitorRevista({ ebook, admin }: { ebook: EbookRow; admin: boolean }) {
  const [paginas, setPaginas] = useState<PaginaEbook[]>(ebook.paginas);
  const [spread, setSpread] = useState(0);
  const [turn, setTurn] = useState<Turn>(null);
  const [lote, setLote] = useState<{ atual: number; total: number; falhas: number } | null>(null);
  const [trocando, setTrocando] = useState<number | null>(null); // índice da página no painel de troca
  const [promptTroca, setPromptTroca] = useState("");
  const [gerandoTroca, setGerandoTroca] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const bookRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; dir: "frente" | "tras" } | null>(null);
  // Tipografia proporcional: as páginas usam "em"; o tamanho-base acompanha a
  // largura real da revista (1 página = metade do livro).
  const [fontePx, setFontePx] = useState(16);
  useEffect(() => {
    const el = bookRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 900;
      setFontePx(Math.max(8, w / 2 / 24));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const N = paginas.length;
  // Spread s: página esquerda = 2s-1, direita = 2s (capa sozinha à direita).
  const totalSpreads = Math.ceil((N + 1) / 2);
  const esquerda = spread === 0 ? null : (paginas[2 * spread - 1] ?? null);
  const direita = paginas[2 * spread] ?? null;
  const podeFrente = spread < totalSpreads - 1;
  const podeTras = spread > 0;

  const [ar1, ar2] = PROPORCAO[ebook.formato] ?? PROPORCAO.a4;
  const semImagem = paginas.filter((p) => !p.imagem_url).length;

  /* ------------------------- virada de página ------------------------- */
  const completar = useCallback(
    (dir: "frente" | "tras") => {
      setTurn({ dir, deg: 180, soltando: true });
      setTimeout(() => {
        setSpread((s) => (dir === "frente" ? s + 1 : s - 1));
        setTurn(null);
      }, 380);
    },
    [],
  );

  const virar = useCallback(
    (dir: "frente" | "tras") => {
      if (turn) return;
      if (dir === "frente" && !podeFrente) return;
      if (dir === "tras" && !podeTras) return;
      setTurn({ dir, deg: 12, soltando: false });
      requestAnimationFrame(() => completar(dir));
    },
    [turn, podeFrente, podeTras, completar],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") virar("frente");
      if (e.key === "ArrowLeft") virar("tras");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [virar]);

  function onPointerDown(e: React.PointerEvent) {
    if (turn?.soltando || trocando !== null) return;
    const rect = bookRef.current?.getBoundingClientRect();
    if (!rect) return;
    const meio = rect.left + rect.width / 2;
    const dir: "frente" | "tras" = e.clientX >= meio ? "frente" : "tras";
    if (dir === "frente" && !podeFrente) return;
    if (dir === "tras" && !podeTras) return;
    dragRef.current = { startX: e.clientX, dir };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    const rect = bookRef.current?.getBoundingClientRect();
    if (!drag || !rect) return;
    const delta = drag.dir === "frente" ? drag.startX - e.clientX : e.clientX - drag.startX;
    const deg = Math.max(0, Math.min(180, (delta / (rect.width / 2)) * 180));
    setTurn({ dir: drag.dir, deg, soltando: false });
  }

  function onPointerUp() {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    setTurn((t) => {
      if (!t) return null;
      if (t.deg > 70) {
        setTimeout(() => completar(t.dir), 0);
        return { ...t, soltando: true };
      }
      // volta ao lugar
      return null;
    });
  }

  /* --------------------- geração de imagens em lote -------------------- */
  async function aprovarEGerarImagens() {
    const indices = paginas.map((p, i) => (p.imagem_url ? -1 : i)).filter((i) => i >= 0);
    let falhas = 0;
    for (let n = 0; n < indices.length; n++) {
      const i = indices[n];
      setLote({ atual: n + 1, total: indices.length, falhas });
      let res = await gerarImagemPagina(ebook.id, i);
      if (res.error) {
        res = await gerarImagemPagina(ebook.id, i);
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

  /* ------------------------- troca de imagem --------------------------- */
  function abrirTroca(indice: number) {
    setTrocando(indice);
    setPromptTroca(paginas[indice]?.prompt_imagem ?? "");
  }

  async function confirmarTroca() {
    if (trocando === null) return;
    setGerandoTroca(true);
    const res = await gerarImagemPagina(ebook.id, trocando, { prompt: promptTroca, forcar: true });
    if (res.url) {
      const url = res.url;
      setPaginas((ps) =>
        ps.map((p, j) => (j === trocando ? { ...p, imagem_url: url, prompt_imagem: promptTroca } : p)),
      );
      setTrocando(null);
    }
    setGerandoTroca(false);
  }

  async function copiarLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/revista/${ebook.id}`);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  /* --------------------------- render sheet ---------------------------- */
  // Página revelada por baixo da folha que vira
  const revelDireita = turn?.dir === "frente" ? (paginas[2 * (spread + 1)] ?? null) : direita;
  const revelEsquerda =
    turn?.dir === "tras" ? (spread - 1 === 0 ? null : (paginas[2 * (spread - 1) - 1] ?? null)) : esquerda;
  // Folha que gira: frente/verso
  const folhaFrente = turn?.dir === "frente" ? direita : esquerda;
  const folhaVerso =
    turn?.dir === "frente" ? (paginas[2 * (spread + 1) - 1] ?? null) : (paginas[2 * (spread - 1)] ?? null);

  return (
    <div>
      {/* ---------- barra de aprovação (admin) ---------- */}
      {admin && lote && (
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
        </div>
      )}
      {admin && !lote && semImagem > 0 && (
        <div className="ebook-no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warn/40 bg-warn/10 p-4">
          <div>
            <p className="font-bold">📝 Revise o texto antes de gastar com imagens</p>
            <p className="text-sm text-paper-dim">
              Folheie a revista abaixo. Aprovando, geramos {semImagem} imagens (~US$
              {(semImagem * (ebook.qualidade_imagem === "alta" ? 0.22 : 0.07)).toFixed(2)}).
            </p>
          </div>
          <button
            onClick={aprovarEGerarImagens}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2"
          >
            ✅ Aprovar e gerar {semImagem} imagens
          </button>
        </div>
      )}

      {/* ---------- controles ---------- */}
      <div className="ebook-no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => virar("tras")}
            disabled={!podeTras}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-lg transition hover:border-brand-2 disabled:opacity-30"
            aria-label="Página anterior"
          >
            ‹
          </button>
          <span className="text-sm tabular-nums text-paper-dim">
            {spread === 0 ? "capa" : `${2 * spread - 1}–${Math.min(2 * spread, N - 1)}`} · {N} págs
          </span>
          <button
            onClick={() => virar("frente")}
            disabled={!podeFrente}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-lg transition hover:border-brand-2 disabled:opacity-30"
            aria-label="Próxima página"
          >
            ›
          </button>
          <span className="ml-2 hidden text-xs text-paper-dim sm:inline">
            💡 arraste a página com o mouse para virar
          </span>
        </div>
        <div className="flex items-center gap-2">
          {admin && (
            <>
              <button
                onClick={copiarLink}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-bold text-paper transition hover:border-brand-2"
              >
                {copiado ? "✅ Copiado!" : "🔗 Link da revista"}
              </button>
              <button
                onClick={() => window.print()}
                className="rounded-lg bg-brand px-4 py-1.5 text-sm font-bold text-white transition hover:bg-brand-2"
              >
                ⬇️ PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* ---------- a revista aberta ---------- */}
      <div className="ebook-no-print flex justify-center">
        <div
          ref={bookRef}
          className="ebk-book relative w-full touch-none select-none"
          style={{
            aspectRatio: `${ar1 * 2}/${ar2}`,
            maxWidth: ebook.formato === "mobile" ? 720 : ebook.formato === "quadrado" ? 860 : 940,
            perspective: 2600,
            fontSize: fontePx,
            cursor: turn && !turn.soltando ? "grabbing" : "grab",
            filter: "drop-shadow(0 24px 48px rgba(0,0,0,0.5))",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* base: páginas estáticas do spread */}
          <div className="absolute inset-y-0 left-0 w-1/2">
            <PaginaFace pag={revelEsquerda} lado="esq" numero={turn?.dir === "tras" ? 2 * (spread - 1) - 1 : 2 * spread - 1} total={N} titulo={ebook.titulo} vazia={spread === 0 && !turn} />
          </div>
          <div className="absolute inset-y-0 right-0 w-1/2">
            <PaginaFace pag={revelDireita} lado="dir" numero={turn?.dir === "frente" ? 2 * (spread + 1) : 2 * spread} total={N} titulo={ebook.titulo} vazia={turn?.dir === "frente" && !revelDireita} />
          </div>

          {/* folha que vira */}
          {turn && (
            <div
              className="ebk-sheet absolute inset-y-0 z-10 w-1/2"
              style={{
                left: turn.dir === "frente" ? "50%" : 0,
                transformOrigin: turn.dir === "frente" ? "left center" : "right center",
                transform: `rotateY(${turn.dir === "frente" ? -turn.deg : turn.deg}deg)`,
                transition: turn.soltando ? "transform 0.38s cubic-bezier(0.4, 0.1, 0.2, 1)" : "none",
                transformStyle: "preserve-3d",
              }}
            >
              <div className="ebk-face absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
                <PaginaFace pag={folhaFrente} lado={turn.dir === "frente" ? "dir" : "esq"} numero={turn.dir === "frente" ? 2 * spread : 2 * spread - 1} total={N} titulo={ebook.titulo} />
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: `linear-gradient(to ${turn.dir === "frente" ? "left" : "right"}, rgba(0,0,0,${Math.min(0.45, turn.deg / 400)}), transparent 60%)`,
                  }}
                />
              </div>
              <div
                className="ebk-face absolute inset-0"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                <PaginaFace pag={folhaVerso} lado={turn.dir === "frente" ? "esq" : "dir"} numero={turn.dir === "frente" ? 2 * (spread + 1) - 1 : 2 * (spread - 1)} total={N} titulo={ebook.titulo} />
              </div>
            </div>
          )}

          {/* lombada */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-8 -translate-x-1/2 bg-gradient-to-r from-transparent via-black/25 to-transparent" />
        </div>
      </div>

      {/* ---------- miniaturas ---------- */}
      <div className="ebook-no-print mt-5 flex gap-2 overflow-x-auto pb-2">
        {paginas.map((p, i) => {
          const s = Math.ceil(i / 2);
          return (
            <div key={i} className="relative flex-none">
              <button
                onClick={() => setSpread(s)}
                className={`relative block h-24 overflow-hidden rounded-md border-2 transition ${
                  s === spread ? "border-brand-2" : "border-white/10 hover:border-white/30"
                }`}
                style={{ aspectRatio: `${ar1}/${ar2}` }}
                title={p.titulo}
              >
                {p.imagem_url ? (
                  <img src={p.imagem_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-ink-3 px-1 text-center text-[9px] leading-tight text-paper-dim">
                    {p.titulo}
                  </span>
                )}
              </button>
              {admin && (
                <button
                  onClick={() => abrirTroca(i)}
                  title="Trocar a imagem desta página"
                  className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-ink-3 text-[11px] opacity-0 shadow transition hover:border-brand-2 hover:opacity-100 [div:hover>&]:opacity-100"
                >
                  🔄
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ---------- painel de troca de imagem ---------- */}
      {admin && trocando !== null && (
        <div
          className="ebook-no-print fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => !gerandoTroca && setTrocando(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-ink-2 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-1 text-lg font-extrabold">🔄 Trocar imagem</h3>
            <p className="mb-4 text-sm text-paper-dim">
              Página {trocando}: “{paginas[trocando]?.titulo}”. Edite a descrição da imagem e gere
              uma nova (~US${ebook.qualidade_imagem === "alta" ? "0,22" : "0,07"}).
            </p>
            {paginas[trocando]?.imagem_url && (
              <img
                src={paginas[trocando]!.imagem_url!}
                alt=""
                className="mb-3 h-32 w-full rounded-lg object-cover"
              />
            )}
            <textarea
              value={promptTroca}
              onChange={(e) => setPromptTroca(e.target.value)}
              rows={4}
              className="mb-4 w-full rounded-lg border border-white/10 bg-ink px-4 py-2.5 text-sm outline-none focus-visible:border-brand-2"
              placeholder="Descreva a imagem que você quer nesta página…"
            />
            <div className="flex gap-2">
              <button
                onClick={confirmarTroca}
                disabled={gerandoTroca || promptTroca.trim().length < 5}
                className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-50"
              >
                {gerandoTroca ? "Gerando nova imagem…" : "🎨 Gerar nova imagem"}
              </button>
              <button
                onClick={() => setTrocando(null)}
                disabled={gerandoTroca}
                className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-bold transition hover:border-white/30"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- impressão: uma página por folha ---------- */}
      <div className="ebook-print-area hidden">
        {paginas.map((p, i) => (
          <div key={i} className="ebook-print-page" style={{ aspectRatio: `${ar1}/${ar2}` }}>
            <PaginaFace pag={p} lado={i % 2 === 0 ? "dir" : "esq"} numero={i} total={N} titulo={ebook.titulo} print />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==================================================================== */
/* Diagramação editorial das páginas                                     */
/* ==================================================================== */

function PaginaFace({
  pag,
  lado,
  numero,
  total,
  titulo,
  vazia,
  print,
}: {
  pag: PaginaEbook | null;
  lado: "esq" | "dir";
  numero: number;
  total: number;
  titulo: string;
  vazia?: boolean;
  print?: boolean;
}) {
  const borda = print
    ? ""
    : lado === "esq"
      ? "rounded-l-xl"
      : "rounded-r-xl";

  if (!pag || vazia) {
    return (
      <div className={`h-full w-full bg-[#e9e4da] ${borda}`} style={{ boxShadow: "inset 0 0 60px rgba(0,0,0,0.08)" }} />
    );
  }

  const ehCapa = pag.tipo === "capa";
  const layout = ehCapa ? "capa" : (pag.layout ?? "classico");

  /* rodapé/cabeçalho editorial compartilhado */
  const cabecalho = !ehCapa && (
    <div className="ebk-head flex flex-none items-center justify-between px-[7%] pt-[4%] text-[max(7px,0.55em)] font-bold uppercase tracking-[0.22em] text-[#a3987f]">
      <span className="truncate">{titulo}</span>
      {pag.kicker && <span className="ml-3 truncate text-right">{pag.kicker}</span>}
    </div>
  );
  const rodape = !ehCapa && (
    <div className="flex flex-none items-center justify-between px-[7%] pb-[3.5%] text-[max(7px,0.55em)] text-[#a3987f]">
      <span className="h-px w-8 bg-[#c9c0a8]" />
      <span className="font-bold">{numero}</span>
    </div>
  );

  if (layout === "capa") {
    return (
      <div className={`relative h-full w-full overflow-hidden bg-[#171512] ${borda}`}>
        {pag.imagem_url && (
          <img src={pag.imagem_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/40" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-[8%] pt-[6%]">
          <span className="text-[max(8px,0.6em)] font-bold uppercase tracking-[0.3em] text-white/90">
            {pag.kicker || "Edição especial"}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-[8%] text-white">
          <div className="mb-[3%] h-[3px] w-[18%] bg-[#d9b45a]" />
          <h2 className="font-display text-[2.1em] font-extrabold leading-[1.02] tracking-tight">
            {pag.titulo}
          </h2>
          {pag.texto && (
            <p className="mt-[3%] max-w-[85%] text-[0.85em] leading-snug text-white/85">{pag.texto}</p>
          )}
        </div>
      </div>
    );
  }

  if (layout === "full") {
    return (
      <div className={`relative h-full w-full overflow-hidden bg-[#22201c] ${borda}`}>
        {pag.imagem_url ? (
          <img src={pag.imagem_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <SemImagem />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25" />
        {pag.kicker && (
          <span className="absolute left-[7%] top-[5%] text-[max(7px,0.55em)] font-bold uppercase tracking-[0.25em] text-white/85">
            {pag.kicker}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-[7%]">
          <div className="rounded-lg bg-[#faf7f0]/95 p-[5%] shadow-2xl backdrop-blur">
            <h3 className="font-display text-[1.15em] font-extrabold leading-tight text-[#191713]">
              {pag.titulo}
            </h3>
            {pag.texto && (
              <p className="mt-[2%] whitespace-pre-line text-[0.72em] leading-relaxed text-[#45403a]">
                {pag.texto}
              </p>
            )}
          </div>
          <div className="mt-[3%] text-right text-[max(7px,0.55em)] font-bold text-white/80">{numero}</div>
        </div>
      </div>
    );
  }

  if (layout === "citacao") {
    return (
      <div className={`flex h-full w-full flex-col overflow-hidden bg-[#191713] text-[#f2ede1] ${borda}`}>
        {cabecalho && (
          <div className="flex flex-none items-center justify-between px-[7%] pt-[4%] text-[max(7px,0.55em)] font-bold uppercase tracking-[0.22em] text-[#8f8672]">
            <span className="truncate">{titulo}</span>
            {pag.kicker && <span className="ml-3 truncate">{pag.kicker}</span>}
          </div>
        )}
        <div className="flex min-h-0 flex-1 flex-col justify-center px-[9%]">
          <span className="font-display text-[3em] leading-none text-[#d9b45a]">“</span>
          <p className="font-display text-[1.35em] font-extrabold leading-[1.15] tracking-tight">
            {pag.destaque || pag.titulo}
          </p>
          <div className="mt-[4%] h-[2px] w-[16%] bg-[#d9b45a]" />
          {pag.texto && (
            <p className="mt-[4%] whitespace-pre-line text-[0.72em] leading-relaxed text-[#bdb4a0]">
              {pag.texto}
            </p>
          )}
        </div>
        {pag.imagem_url && (
          <div className="h-[22%] flex-none">
            <img src={pag.imagem_url} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex flex-none items-center justify-between px-[7%] py-[3%] text-[max(7px,0.55em)] text-[#8f8672]">
          <span className="h-px w-8 bg-[#59523f]" />
          <span className="font-bold">{numero}</span>
        </div>
      </div>
    );
  }

  if (layout === "lateral") {
    const imgEsq = lado === "dir"; // imagem sempre "para fora" da lombada? não: alterna pelo lado
    return (
      <div className={`flex h-full w-full overflow-hidden bg-[#faf7f0] ${borda} ${imgEsq ? "" : "flex-row-reverse"}`}>
        <div className="relative h-full w-[46%] flex-none bg-[#e5dfd2]">
          {pag.imagem_url ? (
            <img src={pag.imagem_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <SemImagem />
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          {cabecalho}
          <div className="flex min-h-0 flex-1 flex-col justify-center px-[9%] py-[4%]">
            <h3 className="font-display text-[1.2em] font-extrabold leading-tight text-[#191713]">
              {pag.titulo}
            </h3>
            <div className="mt-[3%] h-[2px] w-[15%] bg-[#d9b45a]" />
            <div className="ebk-dropcap mt-[4%] min-h-0 flex-1 overflow-hidden whitespace-pre-line text-[0.72em] leading-relaxed text-[#3d3a33]">
              {pag.texto}
            </div>
          </div>
          {rodape}
        </div>
      </div>
    );
  }

  // classico
  return (
    <div className={`flex h-full w-full flex-col overflow-hidden bg-[#faf7f0] ${borda}`}>
      <div className="relative h-[38%] flex-none bg-[#e5dfd2]">
        {pag.imagem_url ? (
          <img src={pag.imagem_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <SemImagem />
        )}
        {pag.kicker && (
          <span className="absolute bottom-[6%] left-[7%] rounded-sm bg-[#191713]/85 px-[2.5%] py-[1%] text-[max(7px,0.55em)] font-bold uppercase tracking-[0.2em] text-[#e9dbb8]">
            {pag.kicker}
          </span>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-[8%] pt-[4%]">
        <h3 className="font-display text-[1.2em] font-extrabold leading-tight text-[#191713]">
          {pag.titulo}
        </h3>
        {pag.destaque && (
          <p className="mt-[2.5%] border-l-[3px] border-[#d9b45a] pl-[3%] text-[0.78em] font-semibold italic leading-snug text-[#8a7440]">
            {pag.destaque}
          </p>
        )}
        <div className="ebk-dropcap mt-[3%] min-h-0 flex-1 overflow-hidden whitespace-pre-line text-[0.72em] leading-relaxed text-[#3d3a33]">
          {pag.texto}
        </div>
      </div>
      <div className="flex flex-none items-center justify-between px-[8%] py-[3.5%] text-[max(7px,0.55em)] text-[#a3987f]">
        <span className="truncate uppercase tracking-[0.2em]">{titulo}</span>
        <span className="font-bold">
          {numero} <span className="text-[#c9c0a8]">/ {total - 1}</span>
        </span>
      </div>
    </div>
  );
}

function SemImagem() {
  return (
    <div className="flex h-full w-full items-center justify-center text-[0.6em] text-[#a3987f]">
      imagem ainda não gerada
    </div>
  );
}
