"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MODELOS_IA } from "@/lib/ia/modelos";
import {
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
}: {
  site: SiteIA;
  mensagensIniciais: MensagemRow[];
  versoesIniciais: VersaoRow[];
  temChave: boolean;
}) {
  const [html, setHtml] = useState(site.html);
  const [modelo, setModelo] = useState(site.modelo);
  const [publicado, setPublicado] = useState(site.publicado);
  const [versoes, setVersoes] = useState(versoesIniciais);
  const [mostrarVersoes, setMostrarVersoes] = useState(false);
  const [dispositivo, setDispositivo] = useState<"desktop" | "mobile">("desktop");

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

  function abrirEmNovaAba() {
    if (!html) return;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function voltarPara(versaoId: string) {
    const res = await restaurarVersao(site.id, versaoId);
    if (res && "html" in res && res.html) {
      setHtml(res.html);
      setMostrarVersoes(false);
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-ink">
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

        <button
          onClick={() => setMostrarVersoes((v) => !v)}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-paper-dim transition hover:border-white/30 hover:text-paper"
        >
          Versões ({versoes.length})
        </button>
        <button
          onClick={abrirEmNovaAba}
          disabled={!html}
          title="Abrir em nova aba"
          className="rounded-lg border border-white/15 p-1.5 text-paper-dim transition hover:border-white/30 hover:text-paper disabled:opacity-40"
        >
          <IconExternal size={15} />
        </button>
        <button
          onClick={() => {
            const novo = !publicado;
            setPublicado(novo);
            publicarPaginaIA(site.id, novo);
          }}
          disabled={!html}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition disabled:opacity-40 ${
            publicado
              ? "border border-ok/40 text-ok hover:bg-ok/10"
              : "bg-brand text-white hover:bg-brand-2"
          }`}
        >
          <IconRocket size={14} /> {publicado ? "No ar" : "Publicar"}
        </button>
      </header>

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
