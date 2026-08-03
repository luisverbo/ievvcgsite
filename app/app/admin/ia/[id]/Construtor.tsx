"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MODELOS_IA } from "@/lib/ia/modelos";
import { listarImagensHtml } from "@/lib/ia/html-imagens";
import PainelPixel from "./PainelPixel";
import {
  gerarImagemIA,
  publicarPaginaIA,
  restaurarVersao,
  trocarModelo,
  type MensagemRow,
  type SiteIA,
  type VersaoRow,
} from "../actions";
import {
  IconBack,
  IconMonitor,
  IconPhone,
  IconExternal,
  IconRocket,
  IconX,
  IconPlus,
} from "@/components/painel/icons";

type AnexoLocal = { tipo: "imagem" | "pdf"; nome: string; media_type: string; data: string };
type Bolha = { papel: "user" | "assistant" | "erro"; conteudo: string; anexos?: { nome: string }[] };

const MAX_MB = 8;

// Lê o arquivo como base64 puro (sem o prefixo "data:...;base64,").
function lerBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result).split(",")[1] ?? "");
    leitor.onerror = () => reject(new Error("Não consegui ler o arquivo."));
    leitor.readAsDataURL(file);
  });
}

export default function Construtor({
  site,
  mensagensIniciais,
  versoesIniciais,
  temChave,
  urlPublica,
}: {
  site: SiteIA;
  mensagensIniciais: MensagemRow[];
  versoesIniciais: VersaoRow[];
  temChave: boolean;
  urlPublica: string;
}) {
  const [html, setHtml] = useState(site.html);
  const [modelo, setModelo] = useState(site.modelo);
  const [publicado, setPublicado] = useState(site.publicado);
  const [publicando, setPublicando] = useState(false);
  const [erroPublicar, setErroPublicar] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [versoes, setVersoes] = useState(versoesIniciais);
  const [mostrarVersoes, setMostrarVersoes] = useState(false);
  const [dispositivo, setDispositivo] = useState<"desktop" | "mobile">("desktop");

  // Imagens que a IA marcou no HTML com data-ia-prompt.
  const imagens = useMemo(() => listarImagensHtml(html), [html]);
  const pendentes = imagens.filter((im) => !im.gerada).length;
  const [mostrarImagens, setMostrarImagens] = useState(false);
  const [mostrarPixel, setMostrarPixel] = useState(false);
  const [qualidadeImg, setQualidadeImg] = useState<"media" | "alta">("media");
  const [promptsImg, setPromptsImg] = useState<Record<number, string>>({});
  const [gerandoImg, setGerandoImg] = useState<Set<number>>(new Set());
  const [erroImg, setErroImg] = useState<Record<number, string>>({});

  const [bolhas, setBolhas] = useState<Bolha[]>(
    mensagensIniciais.map((m) => ({ papel: m.papel, conteudo: m.conteudo, anexos: m.anexos })),
  );
  const [texto, setTexto] = useState("");
  const [anexos, setAnexos] = useState<AnexoLocal[]>([]);
  const [gerando, setGerando] = useState(false);
  const [ticker, setTicker] = useState(""); // o código chegando ao vivo

  const fimChat = useRef<HTMLDivElement>(null);
  const tickerRef = useRef<HTMLPreElement>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fimChat.current?.scrollIntoView({ behavior: "smooth" });
  }, [bolhas, gerando]);

  useEffect(() => {
    const el = tickerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [ticker]);

  async function anexar(files: FileList | null) {
    if (!files?.length) return;
    const novos: AnexoLocal[] = [];
    for (const file of Array.from(files).slice(0, 5)) {
      if (file.size > MAX_MB * 1024 * 1024) {
        setBolhas((b) => [
          ...b,
          { papel: "erro", conteudo: `"${file.name}" passa de ${MAX_MB}MB.` },
        ]);
        continue;
      }
      const ehPdf = file.type === "application/pdf";
      if (!ehPdf && !file.type.startsWith("image/")) continue;
      novos.push({
        tipo: ehPdf ? "pdf" : "imagem",
        nome: file.name,
        media_type: file.type,
        data: await lerBase64(file),
      });
    }
    setAnexos((a) => [...a, ...novos].slice(0, 5));
    if (inputArquivo.current) inputArquivo.current.value = "";
  }

  async function enviar() {
    const pedido = texto.trim();
    if (pedido.length < 3 || gerando) return;

    setBolhas((b) => [
      ...b,
      { papel: "user", conteudo: pedido, anexos: anexos.map((a) => ({ nome: a.nome })) },
    ]);
    setTexto("");
    const anexosEnvio = anexos;
    setAnexos([]);
    setGerando(true);
    setTicker("");

    try {
      const res = await fetch("/api/ia/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteIaId: site.id, mensagem: pedido, anexos: anexosEnvio }),
      });

      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({ error: "Falha na requisição." }));
        throw new Error(j.error ?? "Falha na requisição.");
      }

      // O corpo chega em NDJSON: uma linha JSON por evento.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let resto = "";
      let acumulado = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        resto += decoder.decode(value, { stream: true });
        const linhas = resto.split("\n");
        resto = linhas.pop() ?? "";

        for (const linha of linhas) {
          if (!linha.trim()) continue;
          const evento = JSON.parse(linha) as
            | { t: "delta"; v: string }
            | { t: "fim"; html: string; resumo: string; versaoId: string | null }
            | { t: "erro"; v: string };

          if (evento.t === "delta") {
            acumulado += evento.v;
            // Só a cauda interessa: o painel mostra o código passando.
            setTicker(acumulado.slice(-4000));
          } else if (evento.t === "fim") {
            setHtml(evento.html);
            setBolhas((b) => [...b, { papel: "assistant", conteudo: evento.resumo }]);
            if (evento.versaoId) {
              setVersoes((v) => [
                { id: evento.versaoId!, resumo: evento.resumo, created_at: new Date().toISOString() },
                ...v,
              ]);
            }
          } else {
            setBolhas((b) => [...b, { papel: "erro", conteudo: evento.v }]);
          }
        }
      }
    } catch (e) {
      setBolhas((b) => [
        ...b,
        { papel: "erro", conteudo: e instanceof Error ? e.message : "Falha ao falar com a IA." },
      ]);
    } finally {
      setGerando(false);
      setTicker("");
    }
  }

  // Antes isto era "dispara e esquece": se o salvamento falhasse, o botão
  // mostrava "No ar" e a página continuava fora — o mesmo tipo de erro
  // silencioso que já tinha acontecido com as cores.
  async function alternarPublicacao() {
    if (publicando || !html) return;
    const novo = !publicado;
    setPublicando(true);
    setErroPublicar("");
    try {
      const res = await publicarPaginaIA(site.id, novo);
      if (res?.error) {
        setErroPublicar(res.error);
        return;
      }
      setPublicado(novo);
    } catch (e) {
      setErroPublicar(e instanceof Error ? e.message : "Não consegui salvar a publicação.");
    } finally {
      setPublicando(false);
    }
  }

  async function voltarPara(versaoId: string) {
    const res = await restaurarVersao(site.id, versaoId);
    if (res && "html" in res && res.html) {
      setHtml(res.html);
      setMostrarVersoes(false);
    }
  }

  async function gerarImagem(indice: number) {
    setGerandoImg((s) => new Set(s).add(indice));
    setErroImg((e) => ({ ...e, [indice]: "" }));
    try {
      const res = await gerarImagemIA(site.id, indice, {
        prompt: promptsImg[indice]?.trim() || undefined,
        qualidade: qualidadeImg,
      });
      if (res.error) setErroImg((e) => ({ ...e, [indice]: res.error! }));
      else if (res.html) setHtml(res.html);
    } catch (e) {
      setErroImg((x) => ({
        ...x,
        [indice]: e instanceof Error ? e.message : "Falha ao gerar a imagem.",
      }));
    } finally {
      setGerandoImg((s) => {
        const novo = new Set(s);
        novo.delete(indice);
        return novo;
      });
    }
  }

  // Fila sequencial: uma imagem por vez, e uma falha não trava as demais.
  async function gerarPendentes() {
    for (const im of listarImagensHtml(html)) {
      if (!im.gerada) await gerarImagem(im.indice);
    }
  }

  return (
    // Mesmo truque do editor de blocos: ocupa a tela abaixo do menu do painel
    // (56px), em vez de fixed — que ficava escondido atrás do menu.
    <div className="flex h-[calc(100vh-56px)] flex-col bg-ink">
      {/* ------------------------------- topo ------------------------------ */}
      <header className="flex flex-none items-center gap-3 border-b border-white/10 bg-ink-2 px-4 py-2.5">
        <Link
          href="/app/admin/ia"
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-paper-dim transition hover:bg-white/10 hover:text-paper"
        >
          <IconBack size={15} /> Voltar
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold">{site.titulo}</h1>
          <p className="truncate text-xs text-paper-dim">/ia/{site.slug}</p>
        </div>

        <select
          value={modelo}
          onChange={(e) => {
            setModelo(e.target.value);
            trocarModelo(site.id, e.target.value);
          }}
          className="rounded-lg border border-white/10 bg-ink px-3 py-1.5 text-xs text-paper outline-none focus-visible:border-brand-2"
          title="Modelo usado nas próximas mensagens"
        >
          {Object.entries(MODELOS_IA).map(([id, m]) => (
            <option key={id} value={id}>
              {m.rotulo}
            </option>
          ))}
        </select>

        <div className="flex flex-none rounded-lg border border-white/10 p-0.5">
          <button
            onClick={() => setDispositivo("desktop")}
            title="Computador"
            className={`rounded-md p-1.5 transition ${dispositivo === "desktop" ? "bg-white/15 text-paper" : "text-paper-dim hover:text-paper"}`}
          >
            <IconMonitor size={15} />
          </button>
          <button
            onClick={() => setDispositivo("mobile")}
            title="Celular"
            className={`rounded-md p-1.5 transition ${dispositivo === "mobile" ? "bg-white/15 text-paper" : "text-paper-dim hover:text-paper"}`}
          >
            <IconPhone size={15} />
          </button>
        </div>

        {imagens.length > 0 && (
          <button
            onClick={() => {
              setMostrarImagens((v) => !v);
              setMostrarVersoes(false);
              setMostrarPixel(false);
            }}
            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
              pendentes > 0
                ? "border-brand-2/50 text-brand-2 hover:bg-brand/10"
                : "border-white/15 text-paper-dim hover:border-white/30 hover:text-paper"
            }`}
          >
            Imagens {pendentes > 0 ? `(${pendentes} p/ gerar)` : `(${imagens.length})`}
          </button>
        )}
        <button
          onClick={() => {
            setMostrarPixel((v) => !v);
            setMostrarImagens(false);
            setMostrarVersoes(false);
          }}
          title="Pixel do Facebook e outras tags"
          className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
            site.facebook_pixel_id
              ? "border-ok/40 text-ok hover:bg-ok/10"
              : "border-white/15 text-paper-dim hover:border-white/30 hover:text-paper"
          }`}
        >
          Pixel {site.facebook_pixel_id ? "✓" : ""}
        </button>
        <button
          onClick={() => {
            setMostrarVersoes((v) => !v);
            setMostrarImagens(false);
            setMostrarPixel(false);
          }}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-paper-dim transition hover:border-white/30 hover:text-paper"
        >
          Versões ({versoes.length})
        </button>
        {publicado && (
          <Link
            href={`/app/sites/${site.id}/metricas`}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-paper-dim transition hover:border-white/30 hover:text-paper"
          >
            Métricas
          </Link>
        )}
        {html ? (
          <a
            href={`/app/admin/ia/${site.id}/ver`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-paper-dim transition hover:border-white/30 hover:text-paper"
          >
            <IconExternal size={14} /> Ver na web
          </a>
        ) : null}
        <button
          onClick={alternarPublicacao}
          disabled={!html || publicando}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition disabled:opacity-40 ${
            publicado
              ? "border border-ok/40 text-ok hover:bg-ok/10"
              : "bg-brand text-white hover:bg-brand-2"
          }`}
        >
          <IconRocket size={14} />{" "}
          {publicando ? "Salvando…" : publicado ? "No ar — despublicar" : "Publicar"}
        </button>
      </header>

      {/* Endereço público: só aparece quando a página está mesmo no ar. */}
      {publicado && (
        <div className="flex flex-none flex-wrap items-center gap-2 border-b border-ok/25 bg-ok/10 px-4 py-2 text-xs">
          <span className="font-bold text-ok">🌐 No ar em</span>
          <a
            href={urlPublica}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 flex-1 truncate font-mono text-paper underline decoration-white/30 underline-offset-2 hover:decoration-paper"
          >
            {urlPublica}
          </a>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(urlPublica);
              setCopiado(true);
              window.setTimeout(() => setCopiado(false), 2000);
            }}
            className="flex-none rounded-md border border-white/20 px-2.5 py-1 font-bold text-paper transition hover:border-white/40"
          >
            {copiado ? "Copiado ✓" : "Copiar link"}
          </button>
          <a
            href={urlPublica}
            target="_blank"
            rel="noreferrer"
            className="flex-none rounded-md bg-ok/20 px-2.5 py-1 font-bold text-ok transition hover:bg-ok/30"
          >
            Abrir página →
          </a>
        </div>
      )}

      {erroPublicar && (
        <p className="flex-none border-b border-danger/30 bg-danger/10 px-4 py-2 text-xs text-danger">
          {erroPublicar}
        </p>
      )}

      <div className="flex min-h-0 flex-1">
        {/* ------------------------------ chat ----------------------------- */}
        <aside className="flex w-full max-w-sm flex-none flex-col border-r border-white/10 bg-ink-2">
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {bolhas.length === 0 && !gerando && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-paper-dim">
                <p className="mb-2 font-bold text-paper">Descreva a página que você quer ✨</p>
                <p>
                  Quanto mais específico, melhor: para quem é, o que vende, qual o preço, que
                  sensação a página tem que passar. Você pode anexar uma imagem de referência ou um
                  PDF com o briefing.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {bolhas.map((b, i) => (
                <div
                  key={i}
                  className={`rounded-xl px-3.5 py-2.5 text-sm ${
                    b.papel === "user"
                      ? "ml-6 bg-brand/20 text-paper"
                      : b.papel === "erro"
                        ? "border border-danger/40 bg-danger/10 text-danger"
                        : "mr-6 border border-white/10 bg-white/5 text-paper"
                  }`}
                >
                  <p className="whitespace-pre-line">{b.conteudo}</p>
                  {!!b.anexos?.length && (
                    <p className="mt-1.5 text-xs opacity-70">
                      📎 {b.anexos.map((a) => a.nome).join(", ")}
                    </p>
                  )}
                </div>
              ))}

              {gerando && (
                <div className="mr-6 rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="mb-2 flex items-center gap-2 text-sm font-bold text-brand-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-brand-2" />
                    Escrevendo a página…
                  </p>
                  <pre
                    ref={tickerRef}
                    className="max-h-40 overflow-hidden whitespace-pre-wrap break-all rounded-lg bg-black/40 p-2 font-mono text-[10px] leading-relaxed text-paper-dim"
                  >
                    {ticker || "…"}
                  </pre>
                </div>
              )}
            </div>
            <div ref={fimChat} />
          </div>

          {/* --------------------------- campo ---------------------------- */}
          <div className="flex-none border-t border-white/10 p-3">
            {!!anexos.length && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {anexos.map((a, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-paper-dim"
                  >
                    {a.tipo === "pdf" ? "📄" : "🖼️"}
                    <span className="max-w-28 truncate">{a.nome}</span>
                    <button
                      onClick={() => setAnexos((x) => x.filter((_, j) => j !== i))}
                      className="transition hover:text-danger"
                    >
                      <IconX size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              <button
                onClick={() => inputArquivo.current?.click()}
                disabled={gerando}
                title="Anexar imagem ou PDF"
                className="flex-none rounded-lg border border-white/15 p-2.5 text-paper-dim transition hover:border-white/30 hover:text-paper disabled:opacity-40"
              >
                <IconPlus size={15} />
              </button>
              <input
                ref={inputArquivo}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                multiple
                hidden
                onChange={(e) => anexar(e.target.files)}
              />
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) enviar();
                }}
                rows={2}
                disabled={gerando || !temChave}
                placeholder={
                  html ? "O que você quer mudar?" : "Descreva a página que você quer criar…"
                }
                className="min-h-0 flex-1 resize-none rounded-lg border border-white/10 bg-ink px-3 py-2.5 text-sm text-paper outline-none focus-visible:border-brand-2 disabled:opacity-60"
              />
              <button
                onClick={enviar}
                disabled={gerando || texto.trim().length < 3 || !temChave}
                className="flex-none rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-40"
              >
                {gerando ? "…" : "Enviar"}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-paper-dim">
              {temChave ? "Ctrl+Enter envia · imagem e PDF aceitos" : "Configure a chave da Anthropic no painel admin."}
            </p>
          </div>
        </aside>

        {/* ----------------------------- prévia ---------------------------- */}
        <main className="relative min-w-0 flex-1 overflow-auto bg-[#0b0d12] p-4">
          {html ? (
            <div
              className="mx-auto h-full overflow-hidden rounded-xl border border-white/10 bg-white shadow-2xl transition-all"
              style={{ maxWidth: dispositivo === "mobile" ? 390 : "100%" }}
            >
              <iframe
                title="Prévia da página"
                srcDoc={html}
                className="h-full w-full"
                // Sem allow-same-origin: a página gerada roda numa origem
                // opaca e não enxerga a sessão do painel.
                sandbox="allow-scripts allow-popups allow-forms"
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="max-w-xs text-center text-sm text-paper-dim">
                A prévia aparece aqui assim que a IA escrever a primeira versão da página.
              </p>
            </div>
          )}

          {mostrarPixel && (
            <PainelPixel
              siteIaId={site.id}
              pixelInicial={site.facebook_pixel_id}
              codigoInicial={site.codigo_head}
              onFechar={() => setMostrarPixel(false)}
            />
          )}

          {mostrarImagens && (
            <div className="absolute right-4 top-4 z-10 flex max-h-[85%] w-96 flex-col rounded-xl border border-white/10 bg-ink-2 p-4 shadow-2xl">
              <div className="mb-3 flex flex-none items-center justify-between">
                <h2 className="text-sm font-bold">Imagens da página 🎨</h2>
                <button
                  onClick={() => setMostrarImagens(false)}
                  className="text-paper-dim transition hover:text-paper"
                >
                  <IconX size={14} />
                </button>
              </div>

              <div className="mb-3 flex flex-none items-center gap-2">
                <select
                  value={qualidadeImg}
                  onChange={(e) => setQualidadeImg(e.target.value as "media" | "alta")}
                  className="rounded-lg border border-white/10 bg-ink px-2.5 py-1.5 text-xs text-paper outline-none"
                >
                  <option value="media">Qualidade média (~US$0,07)</option>
                  <option value="alta">Qualidade alta (~US$0,22)</option>
                </select>
                {pendentes > 0 && (
                  <button
                    onClick={gerarPendentes}
                    disabled={gerandoImg.size > 0}
                    className="flex-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-2 disabled:opacity-50"
                  >
                    {gerandoImg.size > 0 ? "Gerando…" : `Gerar as ${pendentes} pendentes`}
                  </button>
                )}
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
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
                        <p className="text-xs font-bold text-paper">
                          {im.indice + 1}. {im.alt || "(sem alt)"}{" "}
                          <span className="font-normal text-paper-dim">· {im.orientacao}</span>
                        </p>
                        <textarea
                          defaultValue={im.prompt}
                          onChange={(e) =>
                            setPromptsImg((p) => ({ ...p, [im.indice]: e.target.value }))
                          }
                          rows={2}
                          className="mt-1 w-full resize-none rounded-md border border-white/10 bg-ink px-2 py-1.5 text-xs text-paper outline-none focus-visible:border-brand-2"
                        />
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <button
                        onClick={() => gerarImagem(im.indice)}
                        disabled={gerandoImg.has(im.indice)}
                        className="rounded-md border border-brand-2/50 px-2.5 py-1 text-xs font-bold text-brand-2 transition hover:bg-brand/10 disabled:opacity-50"
                      >
                        {gerandoImg.has(im.indice)
                          ? "Gerando…"
                          : im.gerada
                            ? "Gerar de novo"
                            : "Gerar"}
                      </button>
                      {erroImg[im.indice] && (
                        <p className="min-w-0 flex-1 truncate text-xs text-danger" title={erroImg[im.indice]}>
                          {erroImg[im.indice]}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mostrarVersoes && (
            <div className="absolute right-4 top-4 z-10 w-80 rounded-xl border border-white/10 bg-ink-2 p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold">Histórico</h2>
                <button
                  onClick={() => setMostrarVersoes(false)}
                  className="text-paper-dim transition hover:text-paper"
                >
                  <IconX size={14} />
                </button>
              </div>
              {versoes.length === 0 ? (
                <p className="text-xs text-paper-dim">Nenhuma versão salva ainda.</p>
              ) : (
                <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
                  {versoes.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => voltarPara(v.id)}
                      className="rounded-lg border border-white/10 p-2.5 text-left transition hover:border-brand-2"
                    >
                      <p className="text-xs text-paper-dim">
                        {new Date(v.created_at).toLocaleString("pt-BR")}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-paper">
                        {v.resumo ?? "Versão salva"}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
