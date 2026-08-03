"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { separarEbookHtml } from "@/lib/ebooks/parse";
import { listarImagensHtml } from "@/lib/ia/html-imagens";
import { gerarImagemEbookIA } from "@/app/app/admin/ebooks/actions";
import type { EbookRow } from "@/app/app/admin/ebooks/actions";

// Leitor dos ebooks diagramados pela Claude. Cada página é HTML puro,
// renderizado em shadow DOM: o CSS do ebook fica isolado do painel (e o do
// painel não vaza para dentro da página).

const PROPORCAO: Record<string, number> = { a4: 1 / 1.414, mobile: 1 / 1.9, quadrado: 1 };

type Turn = { dir: "frente" | "tras"; deg: number; soltando: boolean } | null;

/* ------------------------------ uma página ------------------------------- */
function Face({ html, estilo }: { html: string | null; estilo: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    if (!html) {
      shadow.innerHTML = "";
      return;
    }
    // container-type + cqw fazem todo o em/rem do ebook escalar junto com o
    // tamanho da página, então o texto nunca estoura ao redimensionar.
    shadow.innerHTML = `<style>
:host{display:block;width:100%;height:100%;container-type:inline-size;font-size:2.7cqw;overflow:hidden}
*{box-sizing:border-box}
img{max-width:100%}
${estilo}
</style>${html}`;
  }, [html, estilo]);

  if (!html) return <div className="h-full w-full bg-[#0f1117]" />;
  return <div ref={ref} className="h-full w-full bg-white" />;
}

export default function LeitorHtml({ ebook, admin }: { ebook: EbookRow; admin: boolean }) {
  const [html, setHtml] = useState(ebook.html ?? "");
  const { estilo, paginas } = useMemo(() => separarEbookHtml(html), [html]);

  const [spread, setSpread] = useState(0);
  const [turn, setTurn] = useState<Turn>(null);
  const [painel, setPainel] = useState<"nenhum" | "imagens" | "ajuste">("nenhum");
  const [copiado, setCopiado] = useState(false);

  const bookRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; dir: "frente" | "tras" } | null>(null);

  const proporcao = PROPORCAO[ebook.formato] ?? PROPORCAO.a4;
  const totalSpreads = Math.max(1, Math.ceil((paginas.length + 1) / 2));

  // Capa sozinha; depois as páginas em duplas, como uma revista aberta.
  const esquerda = spread === 0 ? null : (paginas[2 * spread - 1] ?? null);
  const direita = spread === 0 ? (paginas[0] ?? null) : (paginas[2 * spread] ?? null);
  const podeFrente = spread < totalSpreads - 1;
  const podeTras = spread > 0;

  /* --------------------------- virar a página --------------------------- */
  const completar = useCallback((dir: "frente" | "tras") => {
    setTurn({ dir, deg: 180, soltando: true });
    setTimeout(() => {
      setSpread((s) => (dir === "frente" ? s + 1 : s - 1));
      setTurn(null);
    }, 380);
  }, []);

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
    if (turn?.soltando || painel !== "nenhum") return;
    const rect = bookRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dir: "frente" | "tras" = e.clientX >= rect.left + rect.width / 2 ? "frente" : "tras";
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
    setTurn({
      dir: drag.dir,
      deg: Math.max(0, Math.min(180, (delta / (rect.width / 2)) * 180)),
      soltando: false,
    });
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
      return null;
    });
  }

  async function copiarLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/revista/${ebook.id}`);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const folhaVirando = turn !== null;
  const revelDireita = turn?.dir === "frente" ? (paginas[2 * (spread + 1)] ?? null) : direita;
  const revelEsquerda =
    turn?.dir === "tras"
      ? spread - 1 === 0
        ? null
        : (paginas[2 * (spread - 1) - 1] ?? null)
      : esquerda;

  if (paginas.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-ink-2 p-6 text-sm text-paper-dim">
        Este ebook ainda não tem páginas.{" "}
        {ebook.status === "gerando"
          ? "A IA ainda está escrevendo — atualize a página em alguns instantes."
          : "Algo deu errado na geração. Crie outro ou peça um ajuste."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* --------------------------- barra --------------------------- */}
      <div className="ebook-no-print flex flex-wrap items-center gap-2">
        <button
          onClick={() => virar("tras")}
          disabled={!podeTras}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-bold text-paper transition hover:border-white/40 disabled:opacity-30"
        >
          ←
        </button>
        <span className="text-xs text-paper-dim">
          {spread + 1} / {totalSpreads}
        </span>
        <button
          onClick={() => virar("frente")}
          disabled={!podeFrente}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-bold text-paper transition hover:border-white/40 disabled:opacity-30"
        >
          →
        </button>

        <span className="ml-auto text-xs text-paper-dim">{paginas.length} páginas</span>

        {admin && (
          <>
            <button
              onClick={() => setPainel((p) => (p === "imagens" ? "nenhum" : "imagens"))}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-paper-dim transition hover:border-white/40 hover:text-paper"
            >
              Imagens
            </button>
            <button
              onClick={() => setPainel((p) => (p === "ajuste" ? "nenhum" : "ajuste"))}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-paper-dim transition hover:border-white/40 hover:text-paper"
            >
              Pedir ajuste
            </button>
          </>
        )}
        <button
          onClick={copiarLink}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-paper-dim transition hover:border-white/40 hover:text-paper"
        >
          {copiado ? "Copiado ✓" : "Copiar link"}
        </button>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-2"
        >
          Baixar PDF
        </button>
      </div>

      {admin && painel === "imagens" && (
        <PainelImagens ebookId={ebook.id} html={html} onHtml={setHtml} />
      )}
      {admin && painel === "ajuste" && <PainelAjuste ebookId={ebook.id} onHtml={setHtml} />}

      {/* --------------------------- revista --------------------------- */}
      <div
        ref={bookRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="ebook-palco mx-auto w-full max-w-5xl cursor-grab touch-pan-y select-none active:cursor-grabbing"
        style={{ perspective: "2200px" }}
      >
        <div
          className="relative mx-auto grid w-full grid-cols-2 overflow-hidden rounded-lg shadow-2xl"
          style={{ aspectRatio: `${2 * proporcao}` }}
        >
          <div className="relative h-full w-full overflow-hidden">
            <Face html={revelEsquerda} estilo={estilo} />
          </div>
          <div className="relative h-full w-full overflow-hidden">
            <Face html={revelDireita} estilo={estilo} />
          </div>

          {/* folha que gira por cima */}
          {folhaVirando && (
            <div
              className="pointer-events-none absolute top-0 h-full w-1/2 overflow-hidden"
              style={{
                left: turn.dir === "frente" ? "50%" : 0,
                transformOrigin: turn.dir === "frente" ? "left center" : "right center",
                transform: `rotateY(${turn.dir === "frente" ? -turn.deg : turn.deg}deg)`,
                transformStyle: "preserve-3d",
                transition: turn.soltando ? "transform .38s ease-in-out" : "none",
                backfaceVisibility: "hidden",
              }}
            >
              <Face html={turn.dir === "frente" ? direita : esquerda} estilo={estilo} />
            </div>
          )}

          {/* vinco central */}
          <div
            className="pointer-events-none absolute inset-y-0 left-1/2 w-8 -translate-x-1/2"
            style={{
              background:
                "linear-gradient(90deg,transparent,rgba(0,0,0,.16),rgba(0,0,0,.28),rgba(0,0,0,.16),transparent)",
            }}
          />
        </div>
      </div>

      <p className="ebook-no-print text-center text-xs text-paper-dim">
        Arraste a página para virar, ou use as setas do teclado.
      </p>

      {/* Impressão: uma página do ebook por folha. */}
      <div className="hidden print:block">
        {paginas.map((p, i) => (
          <div
            key={i}
            className="ebook-folha"
            style={{ aspectRatio: `${proporcao}`, breakAfter: "page" }}
          >
            <Face html={p} estilo={estilo} />
          </div>
        ))}
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `@media print{
  .ebook-no-print,.ebook-palco{display:none!important}
  body{background:#fff}
  .ebook-folha{width:100%;page-break-after:always}
  @page{margin:0}
}`,
        }}
      />
    </div>
  );
}

/* ---------------------------- painel de imagens --------------------------- */
function PainelImagens({
  ebookId,
  html,
  onHtml,
}: {
  ebookId: string;
  html: string;
  onHtml: (h: string) => void;
}) {
  const imagens = useMemo(() => listarImagensHtml(html), [html]);
  const [gerando, setGerando] = useState<Set<number>>(new Set());
  const [erros, setErros] = useState<Record<number, string>>({});
  const [prompts, setPrompts] = useState<Record<number, string>>({});
  const pendentes = imagens.filter((i) => !i.gerada).length;

  async function gerar(indice: number) {
    setGerando((s) => new Set(s).add(indice));
    setErros((e) => ({ ...e, [indice]: "" }));
    try {
      const res = await gerarImagemEbookIA(ebookId, indice, {
        prompt: prompts[indice]?.trim() || undefined,
      });
      if (res.error) setErros((e) => ({ ...e, [indice]: res.error! }));
      else if (res.html) onHtml(res.html);
    } catch (e) {
      setErros((x) => ({ ...x, [indice]: e instanceof Error ? e.message : "Falha." }));
    } finally {
      setGerando((s) => {
        const n = new Set(s);
        n.delete(indice);
        return n;
      });
    }
  }

  async function gerarTodas() {
    for (const im of imagens) if (!im.gerada) await gerar(im.indice);
  }

  if (imagens.length === 0) {
    return (
      <div className="ebook-no-print rounded-xl border border-white/10 bg-ink-2 p-4 text-sm text-paper-dim">
        Este ebook foi diagramado só com CSS — nenhuma imagem para gerar. 🎉
      </div>
    );
  }

  return (
    <div className="ebook-no-print rounded-xl border border-white/10 bg-ink-2 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-bold">
          Imagens ({imagens.length}) · {pendentes} para gerar
        </h2>
        {pendentes > 0 && (
          <button
            onClick={gerarTodas}
            disabled={gerando.size > 0}
            className="ml-auto rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-2 disabled:opacity-50"
          >
            {gerando.size > 0 ? "Gerando…" : `Gerar as ${pendentes} pendentes`}
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {imagens.map((im) => (
          <div key={im.indice} className="rounded-lg border border-white/10 p-2.5">
            <div className="flex gap-2.5">
              {im.gerada ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={im.src}
                  alt={im.alt}
                  className="h-14 w-14 flex-none rounded-md object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 flex-none items-center justify-center rounded-md border border-dashed border-white/20 text-lg">
                  🖼️
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold">{im.alt || `Imagem ${im.indice + 1}`}</p>
                <textarea
                  defaultValue={im.prompt}
                  onChange={(e) => setPrompts((p) => ({ ...p, [im.indice]: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full resize-none rounded-md border border-white/10 bg-ink px-2 py-1.5 text-xs text-paper outline-none focus-visible:border-brand-2"
                />
              </div>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <button
                onClick={() => gerar(im.indice)}
                disabled={gerando.has(im.indice)}
                className="rounded-md border border-brand-2/50 px-2.5 py-1 text-xs font-bold text-brand-2 transition hover:bg-brand/10 disabled:opacity-50"
              >
                {gerando.has(im.indice) ? "Gerando…" : im.gerada ? "Gerar de novo" : "Gerar"}
              </button>
              {erros[im.indice] && (
                <p className="min-w-0 flex-1 truncate text-xs text-danger" title={erros[im.indice]}>
                  {erros[im.indice]}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------- pedir um ajuste ---------------------------- */
function PainelAjuste({ ebookId, onHtml }: { ebookId: string; onHtml: (h: string) => void }) {
  const [texto, setTexto] = useState("");
  const [rodando, setRodando] = useState(false);
  const [erro, setErro] = useState("");
  const [ticker, setTicker] = useState("");

  async function enviar() {
    const pedido = texto.trim();
    if (pedido.length < 3 || rodando) return;
    setRodando(true);
    setErro("");
    setTicker("");
    try {
      const res = await fetch("/api/ia/ebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ebookId, mensagem: pedido }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({ error: "Falha na requisição." }));
        throw new Error(j.error ?? "Falha na requisição.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let resto = "";
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        resto += decoder.decode(value, { stream: true });
        const linhas = resto.split("\n");
        resto = linhas.pop() ?? "";
        for (const l of linhas) {
          if (!l.trim()) continue;
          const ev = JSON.parse(l) as
            | { t: "delta"; v: string }
            | { t: "fim"; html: string }
            | { t: "erro"; v: string };
          if (ev.t === "delta") {
            acc += ev.v;
            setTicker(acc.slice(-2000));
          } else if (ev.t === "fim") {
            onHtml(ev.html);
            setTexto("");
          } else setErro(ev.v);
        }
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao falar com a IA.");
    } finally {
      setRodando(false);
      setTicker("");
    }
  }

  return (
    <div className="ebook-no-print rounded-xl border border-white/10 bg-ink-2 p-4">
      <h2 className="mb-2 text-sm font-bold">Pedir um ajuste ✨</h2>
      <div className="flex flex-col gap-2 sm:flex-row">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={2}
          disabled={rodando}
          placeholder="Ex: deixa as cores mais quentes, acrescenta um capítulo sobre precificação, encurta os textos das páginas 5 e 6…"
          className="flex-1 resize-none rounded-lg border border-white/10 bg-ink px-3 py-2 text-sm text-paper outline-none focus-visible:border-brand-2"
        />
        <button
          onClick={enviar}
          disabled={rodando || texto.trim().length < 3}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-40"
        >
          {rodando ? "Refazendo…" : "Enviar"}
        </button>
      </div>
      <p className="mt-1.5 text-xs text-paper-dim">
        A IA reescreve o ebook inteiro com o ajuste. Leva alguns minutos — deixe a aba aberta.
      </p>
      {rodando && (
        <pre className="mt-2 max-h-32 overflow-hidden whitespace-pre-wrap break-all rounded-lg bg-black/40 p-2 font-mono text-[10px] text-paper-dim">
          {ticker || "…"}
        </pre>
      )}
      {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
    </div>
  );
}
