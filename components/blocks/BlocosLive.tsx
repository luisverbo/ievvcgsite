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

  useEffect(() => {
    function onMensagem(e: MessageEvent) {
      // Só aceita mensagens do próprio painel (mesma origem).
      if (e.origin !== window.location.origin) return;
      const dados = e.data as { tipo?: string; blocos?: Bloco[] };
      if (dados?.tipo === "pp-preview" && Array.isArray(dados.blocos)) {
        setBlocos(dados.blocos);
      }
    }
    window.addEventListener("message", onMensagem);
    // Avisa o editor que já pode mandar o rascunho atual.
    window.parent?.postMessage({ tipo: "pp-preview-pronto" }, window.location.origin);
    return () => window.removeEventListener("message", onMensagem);
  }, []);

  if (blocos.length === 0) {
    return (
      <div className="pp-empty">
        <div>
          <h1 style={{ fontSize: 28 }}>{ctx.siteNome}</h1>
          <p style={{ marginTop: 12 }}>Esta página ainda não tem conteúdo. Adicione blocos.</p>
        </div>
      </div>
    );
  }

  return <BlockRenderer blocos={blocos} ctx={ctx} />;
}
