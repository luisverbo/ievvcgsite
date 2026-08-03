"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { criarEbookIA } from "./actions";
import { MODELOS_IA, MODELO_PADRAO } from "@/lib/ia/modelos";
import { inputClass, labelClass, fieldClass } from "@/components/painel/ui";

const FORMATOS = [
  { valor: "a4", rotulo: "A4 (revista)", nota: "clássico, ótimo para imprimir" },
  { valor: "mobile", rotulo: "Mobile", nota: "leitura no celular" },
  { valor: "quadrado", rotulo: "Quadrado", nota: "estilo carrossel" },
];

export default function NovoEbook({ temChave }: { temChave: boolean }) {
  const router = useRouter();
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");
  const [ticker, setTicker] = useState("");
  const tickerRef = useRef<HTMLPreElement>(null);

  // Cria o registro e deixa a Claude escrever e diagramar em streaming.
  async function criar(formData: FormData) {
    setErro("");
    setGerando(true);
    setTicker("");

    try {
      const criado = await criarEbookIA(formData);
      if (criado.error || !criado.ebookId) {
        setErro(criado.error ?? "Falha ao criar o ebook.");
        return;
      }

      const res = await fetch("/api/ia/ebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ebookId: criado.ebookId,
          mensagem: String(formData.get("extra") ?? ""),
        }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({ error: "Falha na requisição." }));
        setErro(j.error ?? "Falha na requisição.");
        return;
      }

      // NDJSON: uma linha por evento, igual ao construtor de páginas.
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
          const ev = JSON.parse(linha) as
            | { t: "delta"; v: string }
            | { t: "fim"; paginas: number }
            | { t: "erro"; v: string };
          if (ev.t === "delta") {
            acumulado += ev.v;
            setTicker(acumulado.slice(-4000));
            const el = tickerRef.current;
            if (el) el.scrollTop = el.scrollHeight;
          } else if (ev.t === "fim") {
            router.push(`/app/admin/ebooks/${criado.ebookId}`);
            return;
          } else {
            setErro(ev.v);
          }
        }
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao gerar o ebook.");
    } finally {
      setGerando(false);
    }
  }

  if (gerando) {
    return (
      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-brand-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand-2" />
          Escrevendo e diagramando seu ebook…
        </p>
        <p className="mb-3 text-xs text-paper-dim">
          Leva de 2 a 4 minutos. Deixe esta aba aberta — pode usar o computador normalmente.
        </p>
        <pre
          ref={tickerRef}
          className="max-h-52 overflow-hidden whitespace-pre-wrap break-all rounded-lg bg-black/40 p-3 font-mono text-[10px] leading-relaxed text-paper-dim"
        >
          {ticker || "…"}
        </pre>
        {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
      </div>
    );
  }

  return (
    <form action={criar} className="flex flex-col gap-4">
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="tema">
          Sobre o que é o ebook?
        </label>
        <textarea
          id="tema"
          name="tema"
          rows={5}
          required
          placeholder="Ex: Ebook ensinando confeiteiras iniciantes a fazer pudim de copo para vender. Passo a passo das receitas, precificação, embalagem, como fotografar e divulgar no Instagram. Inclua uma parte de design: como criar a logo no Canva e escolher a paleta de cores. Tom acolhedor e prático."
          className={`${inputClass} resize-y`}
        />
        <p className="text-xs text-paper-dim">
          Quanto mais detalhe, melhor: para quem é, o que a pessoa aprende, que capítulos você quer
          e o tom de voz.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="formato">
            Formato
          </label>
          <select id="formato" name="formato" defaultValue="a4" className={inputClass}>
            {FORMATOS.map((f) => (
              <option key={f.valor} value={f.valor}>
                {f.rotulo} — {f.nota}
              </option>
            ))}
          </select>
        </div>

        <div className={fieldClass}>
          <label className={labelClass} htmlFor="paginas">
            Páginas
          </label>
          <input
            id="paginas"
            name="paginas"
            type="number"
            min={4}
            max={40}
            defaultValue={14}
            className={inputClass}
          />
        </div>

        <div className={fieldClass}>
          <label className={labelClass} htmlFor="modelo_ia">
            Modelo
          </label>
          <select
            id="modelo_ia"
            name="modelo_ia"
            defaultValue={MODELO_PADRAO}
            className={inputClass}
          >
            {Object.entries(MODELOS_IA).map(([id, m]) => (
              <option key={id} value={id}>
                {m.rotulo}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={fieldClass}>
        <label className={labelClass} htmlFor="qualidade_imagem">
          Qualidade das imagens
        </label>
        <select
          id="qualidade_imagem"
          name="qualidade_imagem"
          defaultValue="media"
          className={inputClass}
        >
          <option value="media">Média — ~US$0,07 por imagem</option>
          <option value="alta">Alta — ~US$0,22 por imagem</option>
        </select>
        <p className="text-xs text-paper-dim">
          A IA decide onde a foto agrega (capa, aberturas de capítulo) e resolve as outras páginas
          com design em CSS. Você aprova cada imagem depois, uma a uma.
        </p>
      </div>

      <button
        type="submit"
        disabled={!temChave}
        className="rounded-lg bg-brand px-6 py-3 font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
      >
        ✨ Criar ebook
      </button>

      {!temChave && (
        <p className="text-sm text-danger">
          Configure a chave da Anthropic no painel admin antes de criar o ebook.
        </p>
      )}
      {erro && <p className="text-sm text-danger">{erro}</p>}
    </form>
  );
}
