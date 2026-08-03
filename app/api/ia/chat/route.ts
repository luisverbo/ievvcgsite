import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ehAdmin } from "@/app/app/admin/actions";
import {
  conversarComIA,
  getAnthropicKey,
  modeloValido,
  MEDIA_TYPES_IMAGEM,
  type Anexo,
  type MensagemChat,
} from "@/lib/ia/anthropic";
import { SYSTEM_CONSTRUTOR, promptInicial } from "@/lib/ia/prompt";

// Conversa com o Claude e devolve a resposta em streaming (NDJSON), porque
// escrever uma página inteira leva minutos e ninguém encara uma tela parada.
// Cada linha é um JSON: {t:"delta"|"fim"|"erro", ...}

export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ANEXO_BYTES = 8 * 1024 * 1024; // ~8MB por arquivo
const MAX_ANEXOS = 5;

function erro(mensagem: string, status = 400) {
  return NextResponse.json({ error: mensagem }, { status });
}

// Só deixa passar anexo de tipo conhecido e dentro do tamanho — o base64 vem
// do navegador e não dá para confiar no que ele diz.
function limparAnexos(bruto: unknown): Anexo[] {
  if (!Array.isArray(bruto)) return [];
  const saida: Anexo[] = [];
  for (const item of bruto.slice(0, MAX_ANEXOS)) {
    const a = item as Partial<Anexo>;
    const data = typeof a.data === "string" ? a.data : "";
    const mediaType = String(a.media_type ?? "");
    if (!data || data.length * 0.75 > MAX_ANEXO_BYTES) continue;
    const ehPdf = mediaType === "application/pdf";
    if (!ehPdf && !MEDIA_TYPES_IMAGEM.includes(mediaType)) continue;
    saida.push({
      tipo: ehPdf ? "pdf" : "imagem",
      nome: String(a.nome ?? "arquivo").slice(0, 120),
      media_type: mediaType,
      data,
    });
  }
  return saida;
}

export async function POST(req: Request) {
  if (!(await ehAdmin())) return erro("Sem permissão.", 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return erro("Corpo inválido.");
  }

  const siteIaId = String(body.siteIaId ?? "");
  if (!UUID.test(siteIaId)) return erro("Página inválida.");
  const pedido = String(body.mensagem ?? "").trim();
  if (pedido.length < 3) return erro("Escreva o que você quer na página.");
  const anexos = limparAnexos(body.anexos);

  const key = await getAnthropicKey();
  if (!key) return erro("Configure a chave da Anthropic no painel admin.");

  const supabase = await createClient();
  const { data: siteRow } = await supabase
    .from("sites_ia")
    .select("id, org_id, html, modelo")
    .eq("id", siteIaId)
    .maybeSingle();
  const site = siteRow as { id: string; org_id: string; html: string; modelo: string } | null;
  if (!site) return erro("Página não encontrada.", 404);

  // Histórico do chat. O HTML antigo NÃO volta junto das mensagens antigas —
  // só o atual é reenviado, senão a conversa cresceria sem limite.
  const { data: msgsRow } = await supabase
    .from("sites_ia_mensagens")
    .select("papel, conteudo")
    .eq("site_ia_id", siteIaId)
    .order("created_at", { ascending: true })
    .limit(40);
  const historico = (msgsRow as { papel: "user" | "assistant"; conteudo: string }[] | null) ?? [];

  const primeiraVez = !site.html;
  const mensagens: MensagemChat[] = [
    ...historico.map((m) => ({ papel: m.papel, conteudo: m.conteudo })),
    {
      papel: "user" as const,
      conteudo: primeiraVez ? promptInicial(pedido) : pedido,
      anexos,
    },
  ];

  await supabase.from("sites_ia_mensagens").insert({
    site_ia_id: siteIaId,
    org_id: site.org_id,
    papel: "user",
    conteudo: pedido,
    anexos: anexos.map((a) => ({ tipo: a.tipo, nome: a.nome })),
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const linha = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
        } catch {
          // conexão fechada pelo navegador — nada a fazer
        }
      };

      try {
        const resposta = await conversarComIA({
          key,
          modelo: modeloValido(site.modelo),
          system: SYSTEM_CONSTRUTOR,
          mensagens,
          htmlAtual: site.html || null,
          onTexto: (pedaco) => linha({ t: "delta", v: pedaco }),
        });

        if (!resposta.html) {
          linha({ t: "erro", v: "A IA não devolveu o HTML da página. Tente pedir de novo." });
          controller.close();
          return;
        }

        const agora = new Date().toISOString();
        const [{ data: versao }] = await Promise.all([
          supabase
            .from("sites_ia_versoes")
            .insert({
              site_ia_id: siteIaId,
              org_id: site.org_id,
              html: resposta.html,
              resumo: resposta.resumo.slice(0, 500),
            })
            .select("id")
            .single(),
          supabase.from("sites_ia").update({ html: resposta.html, updated_at: agora }).eq("id", siteIaId),
          supabase.from("sites_ia_mensagens").insert({
            site_ia_id: siteIaId,
            org_id: site.org_id,
            papel: "assistant",
            conteudo: resposta.resumo,
          }),
        ]);

        linha({
          t: "fim",
          html: resposta.html,
          resumo: resposta.resumo,
          versaoId: (versao as { id: string } | null)?.id ?? null,
        });
      } catch (e) {
        linha({ t: "erro", v: e instanceof Error ? e.message : "Falha ao falar com a IA." });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      // Sem isto alguns proxies seguram o corpo e o streaming vira uma
      // resposta única no final.
      "X-Accel-Buffering": "no",
    },
  });
}
