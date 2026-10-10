"use client";

import { useRef, useState, useTransition } from "react";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/client";
import { registrarMidia, removerMidia } from "../actions";
import {
  classificarArquivo,
  emMb,
  MAX_BYTES_MIDIA,
  nomeNoStorage,
  type Midia,
} from "@/lib/ia/midias";

/*
 * Os arquivos da página: vídeo, áudio, PDF, imagem.
 *
 * O construtor só deixava anexar imagem e PDF, e aqueles anexos vão dentro da
 * mensagem para a IA LER. Vídeo é outra coisa: é arquivo para HOSPEDAR e
 * aparecer na página. Quem monta uma landing com três vídeos curtos não tinha
 * por onde subir.
 *
 * Duas decisões que valem explicar:
 *
 *   - O arquivo vai do navegador DIRETO para o armazenamento. Não passa pelo
 *     servidor porque vídeo de 40MB esbarra no teto de corpo da requisição
 *     antes de servir para alguma coisa; as políticas do bucket já prendem
 *     cada conta à própria pasta.
 *   - ZIP é aberto AQUI, no navegador. É como os arquivos realmente chegam —
 *     um zip com a pasta de vídeos — e abrir aqui evita mandar o zip inteiro
 *     para depois mandar o conteúdo de novo.
 */

const ICONE: Record<string, string> = {
  video: "🎬",
  audio: "🎵",
  imagem: "🖼️",
  pdf: "📄",
  outro: "📎",
};

type Fila = { nome: string; estado: "subindo" | "erro"; detalhe?: string };

export default function Midias({
  siteId,
  orgId,
  iniciais,
}: {
  siteId: string;
  orgId: string;
  iniciais: Midia[];
}) {
  const [midias, setMidias] = useState<Midia[]>(iniciais);
  const [fila, setFila] = useState<Fila[]>([]);
  const [aberto, setAberto] = useState(iniciais.length > 0);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  /* Sobe um arquivo e devolve a mídia catalogada (ou lança com o motivo). */
  async function subirUm(nome: string, corpo: Blob) {
    const classe = classificarArquivo(nome);
    if (!classe) throw new Error("formato não aceito");
    if (corpo.size > MAX_BYTES_MIDIA) throw new Error(`passa de ${emMb(MAX_BYTES_MIDIA)}`);
    if (corpo.size === 0) throw new Error("arquivo vazio");

    const caminho = `${orgId}/ia/${siteId}/arquivos/${nomeNoStorage(nome)}`;
    const supabase = createClient();
    const { error } = await supabase.storage.from("midias").upload(caminho, corpo, {
      contentType: classe.mime,
      upsert: false,
    });
    if (error) throw new Error(error.message);

    const r = await registrarMidia(siteId, { nome, caminho, bytes: corpo.size });
    if (r.error || !r.midia) throw new Error(r.error ?? "não deu para catalogar");
    return r.midia;
  }

  async function escolher(files: FileList | File[] | null) {
    if (!files?.length) return;

    /*
     * Abre os zips primeiro, para a fila mostrar os arquivos de verdade —
     * "subindo videos.zip" não diz nada; "subindo topo.mp4, depoimento.mp4"
     * diz tudo.
     */
    const paraSubir: { nome: string; corpo: Blob }[] = [];
    const recusados: Fila[] = [];

    for (const file of Array.from(files)) {
      if (/\.zip$/i.test(file.name)) {
        try {
          const zip = await JSZip.loadAsync(file);
          const dentro = Object.values(zip.files).filter(
            (e) => !e.dir && !e.name.split("/").pop()!.startsWith("."),
          );
          let aceitos = 0;
          for (const entrada of dentro) {
            const nome = entrada.name.split("/").pop()!;
            if (!classificarArquivo(nome)) continue;
            paraSubir.push({ nome, corpo: await entrada.async("blob") });
            aceitos++;
          }
          if (aceitos === 0) {
            recusados.push({
              nome: file.name,
              estado: "erro",
              detalhe: "nenhum vídeo, áudio, imagem ou PDF dentro do zip",
            });
          }
        } catch {
          recusados.push({ nome: file.name, estado: "erro", detalhe: "não consegui abrir o zip" });
        }
        continue;
      }
      paraSubir.push({ nome: file.name, corpo: file });
    }

    setFila([...recusados, ...paraSubir.map((a) => ({ nome: a.nome, estado: "subindo" as const }))]);

    for (const arquivo of paraSubir) {
      try {
        const nova = await subirUm(arquivo.nome, arquivo.corpo);
        setMidias((m) => [nova, ...m]);
        setFila((f) => f.filter((x) => x.nome !== arquivo.nome || x.estado === "erro"));
      } catch (e) {
        setFila((f) =>
          f.map((x) =>
            x.nome === arquivo.nome && x.estado === "subindo"
              ? { ...x, estado: "erro", detalhe: (e as Error).message }
              : x,
          ),
        );
      }
    }
    setAberto(true);
    if (input.current) input.current.value = "";
  }

  function apagar(m: Midia) {
    if (!window.confirm(`Apagar "${m.nome}"?\n\nSe a página já usa este arquivo, ele some de lá também.`)) {
      return;
    }
    iniciar(async () => {
      const r = await removerMidia(siteId, m.id);
      if (!r.error) setMidias((lista) => lista.filter((x) => x.id !== m.id));
    });
  }

  function copiar(m: Midia) {
    void navigator.clipboard.writeText(m.url);
    setCopiado(m.id);
    setTimeout(() => setCopiado(null), 1500);
  }

  return (
    <div className="rounded-xl border border-white/10 bg-ink-2">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-paper"
      >
        🎬 Arquivos da página
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-normal text-paper-dim">
          {midias.length}
        </span>
        <span className="ml-auto text-xs font-normal text-paper-dim">{aberto ? "esconder" : "abrir"}</span>
      </button>

      {aberto && (
        <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-3">
          <p className="text-xs text-paper-dim">
            Vídeo, áudio, imagem ou PDF para <b className="text-paper">aparecer na página</b> — diferente
            do anexo do chat, que serve para a IA olhar. Pode mandar um <b className="text-paper">.zip</b>:
            eu abro aqui e subo o que tiver dentro. Depois é só pedir no chat: “põe o vídeo topo.mp4 no
            começo da página”.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="rounded-lg border border-white/15 px-4 py-2 text-xs font-bold text-paper transition hover:border-brand-2 hover:text-brand-2"
            >
              Escolher arquivos ou zip
            </button>
            <input
              ref={input}
              type="file"
              multiple
              hidden
              accept="video/*,audio/*,image/*,application/pdf,.zip"
              onChange={(e) => void escolher(e.target.files)}
            />
            <span className="text-[11px] text-paper-dim">até {emMb(MAX_BYTES_MIDIA)} por arquivo</span>
          </div>

          {fila.length > 0 && (
            <div className="flex flex-col gap-1">
              {fila.map((f, i) => (
                <p
                  key={`${f.nome}-${i}`}
                  className={`text-xs ${f.estado === "erro" ? "text-danger" : "text-paper-dim"}`}
                >
                  {f.estado === "erro" ? "⚠️" : "⏳"} {f.nome}
                  {f.detalhe ? ` — ${f.detalhe}` : " — subindo…"}
                </p>
              ))}
            </div>
          )}

          {midias.length === 0 ? (
            <p className="text-xs text-paper-dim">Nenhum arquivo ainda.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {midias.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/10 px-3 py-2 text-xs"
                >
                  <span>{ICONE[m.tipo] ?? ICONE.outro}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-paper">{m.nome}</span>
                  <span className="text-paper-dim">{emMb(m.bytes)}</span>
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-paper-dim underline-offset-2 hover:text-paper hover:underline"
                  >
                    abrir
                  </a>
                  <button
                    type="button"
                    onClick={() => copiar(m)}
                    className="text-paper-dim underline-offset-2 hover:text-paper hover:underline"
                  >
                    {copiado === m.id ? "copiado!" : "copiar endereço"}
                  </button>
                  <button
                    type="button"
                    onClick={() => apagar(m)}
                    className="text-paper-dim transition hover:text-danger"
                    title="Apagar"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
