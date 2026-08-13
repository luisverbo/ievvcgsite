import { NextResponse } from "next/server";
import JSZip from "jszip";

import { ARQUIVOS_DO_AGENTE } from "@/lib/agente/pacote";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMinhaOrg } from "@/lib/painel/queries";
import { podeUsar } from "@/lib/painel/permissoes";
import { gerarToken, hashDoToken } from "@/lib/agente/token";

/*
 * Baixar o agente, já configurado.
 *
 * O passo "instale e cole o seu código" é onde um cliente não técnico desiste.
 * Então o .zip sai daqui com o .env pronto: o token é criado no momento do
 * download e gravado dentro do arquivo. O cliente descompacta, roda dois
 * comandos e acabou — não copia nem cola nada.
 *
 * O token vai em claro dentro do .zip, e isso é aceitável: o download é
 * autenticado, sai por HTTPS, e o arquivo acabaria no disco dele de qualquer
 * forma. O que nunca existe em claro é a cópia do NOSSO lado — guardamos só o
 * hash.
 *
 * Os fontes vêm de um módulo gerado no build, não do disco: ler arquivo em
 * tempo de execução faz o empacotador da Vercel arrastar o projeto inteiro
 * para dentro desta função.
 */

export const maxDuration = 60;

const LEIAME = `AGENTE DO PÁGINAPRO
====================

Este programa faz duas coisas, aqui do SEU computador:

  1. busca empresas no Google Maps;
  2. envia a primeira mensagem no SEU WhatsApp.

É por isso que ele roda aqui e não no servidor: o número é o seu, e a busca
sai do seu endereço de internet, sem dividir com mais ninguém.

O QUE FAZER
-----------

1. Instale o Node 22 ou maior: https://nodejs.org

2. Abra o terminal DENTRO da pasta "agente" e rode:

       npm install
       npm run instalar-navegador

3. Ligue:

       npm run servico

Pronto. Deixe essa janela aberta enquanto estiver usando. Se fechar, o agente
para — e volta quando você abrir de novo. Nada se perde: a fila espera.

O seu código de acesso já está configurado no arquivo agente/.env. Não precisa
colar nada.

NÃO COMPARTILHE a pasta com ninguém: o arquivo .env tem o código que dá acesso
à sua conta.
`;

export async function GET() {
  if (!(await podeUsar("prospeccao"))) {
    return new NextResponse("Não encontrado", { status: 404 });
  }
  const org = await getMinhaOrg();
  if (!org) return new NextResponse("Não encontrado", { status: 404 });

  const admin = createAdminClient();
  const { count } = await admin
    .from("agentes")
    .select("id", { count: "exact", head: true })
    .eq("org_id", org.id);
  if ((count ?? 0) >= 5) {
    return new NextResponse(
      "Você já tem 5 agentes. Apague um em Prospecção › Meu agente antes de baixar outro.",
      { status: 400 },
    );
  }

  const zip = new JSZip();
  const raiz = zip.folder("paginapro-agente")!;

  // Os caminhos já vêm relativos à raiz do projeto, e é isso que preserva os
  // imports "../lib/prospeccao/..." do agente.
  for (const [caminho, conteudo] of Object.entries(ARQUIVOS_DO_AGENTE)) {
    raiz.file(caminho, conteudo);
  }

  // O token nasce agora e já entra no .env.
  const token = gerarToken();
  const { error } = await admin.from("agentes").insert({
    org_id: org.id,
    nome: "Computador do cliente",
    token_hash: hashDoToken(token),
    token_final: token.slice(-4),
  });
  if (error) return new NextResponse("Falha ao preparar o agente.", { status: 500 });

  const url = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  raiz.file(
    "agente/.env",
    [
      "# Gerado automaticamente no download. Não compartilhe este arquivo.",
      `PAGINAPRO_URL=${url}`,
      `PAGINAPRO_TOKEN=${token}`,
      "",
      "# Opcional: mostra o navegador trabalhando.",
      "# AGENTE_HEADLESS=false",
      "",
    ].join("\n"),
  );
  raiz.file("LEIA-ME.txt", LEIAME);

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="paginapro-agente.zip"',
      // Cada download traz um token diferente: guardar em cache entregaria o
      // mesmo arquivo (e o mesmo token) para outra pessoa.
      "Cache-Control": "no-store, private",
    },
  });
}
