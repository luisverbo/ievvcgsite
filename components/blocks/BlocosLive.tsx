"use client";

import { useEffect, useState } from "react";
import BlockRenderer, { type RenderCtx } from "./BlockRenderer";

type Bloco = { id: string; tipo: string; config: Record<string, unknown> };

// Usado só na prévia do editor: recebe os blocos em edição por postMessage e
// re-renderiza na hora, sem precisar salvar.
export default function BlocosLive({
  blocosIniciais,
  ctx,
}: {
  blocosIniciais: Bloco[];
  ctx: RenderCtx;
}) {
  const [blocos, setBlocos] = useState<Bloco[]>(blocosIniciais);
  const [temaCss, setTemaCss] = useState<string | null>(null);

  useEffect(() => {
    function onMensagem(e: MessageEvent) {
      // Só aceita mensagens do próprio painel (mesma origem).
      if (e.origin !== window.location.origin) return;
      const dados = e.data as { tipo?: string; blocos?: Bloco[]; temaCss?: string | null };
      if (dados?.tipo === "pp-preview") {
        if (Array.isArray(dados.blocos)) setBlocos(dados.blocos);
        if ("temaCss" in dados) setTemaCss(dados.temaCss ?? null);
      }
    }
    window.addEventListener("message", onMensagem);
    // Avisa o editor que já pode mandar o rascunho atual.
    window.parent?.postMessage({ tipo: "pp-preview-pronto" }, window.location.origin);
    return () => window.removeEventListener("message", onMensagem);
  }, []);

  // O <style> vem depois do tema do site, então vence as variáveis herdadas.
  const estilo = temaCss ? <style dangerouslySetInnerHTML={{ __html: temaCss }} /> : null;

  if (blocos.length === 0) {
    return (
      <>
        {estilo}
        <div className="pp-empty">
          <div>
            <h1 style={{ fontSize: 28 }}>{ctx.siteNome}</h1>
            <p style={{ marginTop: 12 }}>Esta página ainda não tem conteúdo. Adicione blocos.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {estilo}
      <BlockRenderer blocos={blocos} ctx={ctx} />
    </>
  );
}
