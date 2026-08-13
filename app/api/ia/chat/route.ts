import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  conversarComIA,
  ErroIA,
  modeloValido,
  MEDIA_TYPES_IMAGEM,
  type Anexo,
  type MensagemChat,
} from "@/lib/ia/anthropic";
import { SYSTEM_CONSTRUTOR, promptInicial } from "@/lib/ia/prompt";
import { contaDaOrg, cobrar, podeGastar } from "@/lib/creditos/conta";
import { subirImagemIA } from "@/lib/ia/imagens";
import { emDolar } from "@/lib/creditos/precos";

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

  /*
   * Permissão vem da RLS: a página só aparece para quem é membro da
   * organização dona dela. Não existe mais checagem de admin aqui — o
   * construtor agora é de todo cliente do plano.
   */
  const supabase = await createClient();
  const { data: siteRow } = await supabase
    .from("sites_ia")
    .select("id, org_id, html, modelo")
    .eq("id", siteIaId)
    .maybeSingle();
  const site = siteRow as { id: string; org_id: string; html: string; modelo: string } | null;
  if (!site) return erro("Página não encontrada.", 404);

  // Chave própria do cliente ou a nossa descontando crédito — decidido aqui,
  // uma vez, e o resto da rota não precisa saber a diferença.
  const conta = await contaDaOrg(site.org_id);
  const permissao = podeGastar(conta);
  if (!permissao.ok) return erro(permissao.motivo, 402);
  const key = conta.anthropic!;

  /*
   * Hospeda as fotos anexadas antes de falar com a IA.
   *
   * Sem isto a IA só ENXERGA a foto: ela sabe que é a fachada da loja, mas não
   * consegue colocá-la na página, porque <img src> precisa de um endereço.
   * Guardando primeiro, a foto real do cliente entra no site — que é o que ele
   * quer ver quando aprova.
   *
   * Uma falha aqui não derruba a conversa: a IA ainda vê a imagem e trabalha
   * com ela como referência.
   */
  for (const anexo of anexos) {
    if (anexo.tipo !== "imagem") continue;
    try {
      const ext = anexo.media_type.split("/")[1]?.replace("jpeg", "jpg") || "png";
      anexo.url = await subirImagemIA(
        site.org_id,
        siteIaId,
        `envio-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`,
        Buffer.from(anexo.data, "base64"),
        anexo.media_type,
      );
    } catch (e) {
      console.error("[ia/chat] falha ao hospedar anexo:", (e as Error).message);
    }
  }

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

      // Sem isto, uma falha sumia ao recarregar: só a mensagem do usuário
      // ficava salva e a tela voltava em branco, sem explicação.
      const registrarFalha = async (motivo: string) => {
        linha({ t: "erro", v: motivo });
        await supabase.from("sites_ia_mensagens").insert({
          site_ia_id: siteIaId,
          org_id: site.org_id,
          papel: "assistant",
          conteudo: `⚠️ ${motivo}`,
        });
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

        const custo = await cobrar({
          conta,
          modelo: modeloValido(site.modelo),
          uso: resposta.uso,
          descricao: "Geração de página com IA",
          referenciaTipo: "site_ia",
          referenciaId: siteIaId,
        });

        if (!resposta.html) {
          await registrarFalha("A IA não devolveu o HTML da página. Tente pedir de novo.");
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
          // A tela mostra o custo desta geração e o saldo que sobrou.
          custo: conta.fonte === "plataforma" ? emDolar(custo) : null,
          saldo: conta.fonte === "plataforma" ? emDolar(Math.max(0, conta.saldo - custo)) : null,
        });
      } catch (e) {
        /*
         * Recusa e corte por tamanho acontecem DEPOIS de a IA trabalhar: a
         * Anthropic cobra esses tokens de qualquer jeito. Não debitar aqui
         * seria nós pagando o erro do cliente.
         */
        if (e instanceof ErroIA) {
          await cobrar({
            conta,
            modelo: modeloValido(site.modelo),
            uso: e.uso,
            descricao: "Geração interrompida",
            referenciaTipo: "site_ia",
            referenciaId: siteIaId,
          });
        }
        await registrarFalha(e instanceof Error ? e.message : "Falha ao falar com a IA.");
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
