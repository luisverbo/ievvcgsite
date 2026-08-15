import { NextResponse } from "next/server";
import JSZip from "jszip";

import { ARQUIVOS_DO_AGENTE } from "@/lib/agente/pacote";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMinhaOrg } from "@/lib/painel/queries";
import { podeUsar } from "@/lib/painel/permissoes";
import { gerarToken, hashDoToken } from "@/lib/agente/token";
import {
  INSTALAR_BAT,
  LIGAR_BAT,
  INSTALAR_COMMAND,
  LIGAR_COMMAND,
} from "@/lib/agente/instaladores";

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

const LEIAME = `AGENTE DO PAGINAPRO
===================

Este programa faz duas coisas, aqui do SEU computador:

  1. busca empresas no Google Maps;
  2. envia a primeira mensagem no SEU WhatsApp.

E por isso que ele roda aqui e nao no nosso servidor: o numero e o seu, e a
busca sai do seu endereco de internet, sem dividir com mais ninguem.


COMO USAR - SAO DOIS CLIQUES
----------------------------

  NO WINDOWS

    1. Clique duas vezes em  INSTALAR-AGENTE.bat   (so na primeira vez)
    2. Clique duas vezes em  LIGAR-AGENTE.bat      (toda vez que for usar)

  NO MAC

    1. Clique duas vezes em  INSTALAR-AGENTE.command   (so na primeira vez)
    2. Clique duas vezes em  LIGAR-AGENTE.command      (toda vez que for usar)

    Se o Mac disser que o arquivo e de um "desenvolvedor nao identificado":
    clique com o botao direito no arquivo, escolha Abrir, e confirme Abrir.
    Isso acontece so na primeira vez.

Nao precisa instalar mais nada nem digitar comando nenhum. Se faltar o Node
(o programa que faz o agente rodar), o proprio instalador avisa e resolve.

DICA: descompacte na Area de Trabalho. Evite pastas do Google Drive, OneDrive
ou Dropbox — a nuvem mexe nos arquivos durante a instalacao e ela falha. Se
acontecer sem querer, o instalador percebe e instala numa pasta local sozinho.


ENQUANTO ESTIVER USANDO
-----------------------

Deixe a janela preta aberta. Se fechar, o agente para - e volta quando voce
abrir de novo. Nada se perde: a fila espera por ele.


IMPORTANTE
----------

O seu codigo de acesso ja esta configurado dentro do arquivo agente/.env.
Voce nao precisa copiar nem colar nada.

NAO COMPARTILHE esta pasta com ninguem: esse codigo da acesso a sua conta.
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
  /*
   * Os instaladores de duplo clique — o que tira o terminal do caminho.
   *
   * Ficam na RAIZ do .zip, ao lado do LEIA-ME: é o primeiro lugar onde a
   * pessoa olha depois de descompactar. Os .command saem com permissão de
   * execução, senão o Finder do Mac ignora o duplo clique.
   */
  raiz.file("INSTALAR-AGENTE.bat", INSTALAR_BAT);
  raiz.file("LIGAR-AGENTE.bat", LIGAR_BAT);
  raiz.file("INSTALAR-AGENTE.command", INSTALAR_COMMAND, { unixPermissions: 0o755 });
  raiz.file("LIGAR-AGENTE.command", LIGAR_COMMAND, { unixPermissions: 0o755 });
  raiz.file("LEIA-ME.txt", LEIAME);

  /*
   * platform "UNIX" é obrigatório aqui, não é enfeite.
   *
   * É o que faz o .zip carregar as permissões dos arquivos. No padrão ("DOS")
   * o unixPermissions dos .command é descartado em silêncio, eles chegam sem
   * bit de execução — e no Mac o duplo clique simplesmente não faz nada, sem
   * mensagem de erro nenhuma. O Windows ignora este campo, então não custa.
   */
  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    platform: "UNIX",
  });

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
