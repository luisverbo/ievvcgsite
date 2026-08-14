import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  conversarComIA,
  ErroIA,
  ehErroDeChaveIndisponivel,
  modeloValido,
  MEDIA_TYPES_IMAGEM,
  type Anexo,
  type MensagemChat,
} from "@/lib/ia/anthropic";
import { SYSTEM_CONSTRUTOR, promptInicial } from "@/lib/ia/prompt";
import { contaDaOrg, contaDeRespaldo, cobrar, podeGastar, type ContaIA } from "@/lib/creditos/conta";
import { planoVigente, planoFreeAtivo } from "@/lib/painel/permissoes";
import { ehAdmin } from "@/lib/painel/admin";
import { subirImagemIA } from "@/lib/ia/imagens";
import { emDolar } from "@/lib/creditos/precos";

// Conversa com o Claude e devolve a resposta em streaming (NDJSON), porque
// escrever uma página inteira leva minutos e ninguém encara uma tela parada.
// Cada linha é um JSON: {t:"delta"|"fim"|"erro", ...}

export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/*
 * O navegador já encolhe as imagens antes de enviar; estes tetos são a rede
 * de segurança do servidor, não o limite prático.
 *
 * A soma importa mais que o arquivo isolado: a Vercel recusa requisição acima
 * de ~4,5MB, e é a soma que estoura primeiro.
 */
const MAX_ANEXO_BYTES = 4 * 1024 * 1024;
const MAX_ANEXOS = 10;

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

  /*
   * Plano grátis = UMA geração, a do primeiro pedido.
   *
   * A régua é o html: existindo, a página já nasceu — a segunda mensagem é
   * edição, e edição por chat é dos planos pagos. Se a primeira geração
   * falhar (sem html), ele pode tentar de novo; o que não pode é iterar.
   */
  if (!(await ehAdmin())) {
    const { data: orgRow } = await supabase
      .from("organizacoes")
      .select("plano")
      .eq("id", site.org_id)
      .maybeSingle();
    const plano = await planoVigente(site.org_id, (orgRow as { plano: string } | null)?.plano ?? "free");
    if (plano === "free") {
      if (!(await planoFreeAtivo())) {
        return erro("O plano grátis está desativado no momento. Assine para usar o construtor.", 402);
      }
      if (site.html) {
        return erro(
          "No plano grátis a página é gerada uma vez, a partir do primeiro pedido. Para editar conversando com a IA, assine o plano.",
          402,
        );
      }
    }
  }

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

      // Qual conta terminou pagando esta geração. Começa como a resolvida lá em
      // cima; só muda se a chave própria recusar por crédito/validade e a
      // plataforma assumir no lugar dela.
      let contaEfetiva: ContaIA = conta;
      // Nenhum pedaço pode ter ido para a tela ainda quando trocamos de chave —
      // reiniciar a chamada depois de já ter mostrado texto misturaria o
      // começo de uma resposta com o fim de outra.
      let algumTextoEmitido = false;
      const onTexto = (pedaco: string) => {
        algumTextoEmitido = true;
        linha({ t: "delta", v: pedaco });
      };

      try {
        let resposta;
        try {
          resposta = await conversarComIA({
            key,
            modelo: modeloValido(site.modelo),
            system: SYSTEM_CONSTRUTOR,
            mensagens,
            htmlAtual: site.html || null,
            onTexto,
          });
        } catch (e) {
          /*
           * A chave do cliente ficou sem crédito ou foi revogada: ele
           * continua com tudo o que já paga aqui (prospecção, WhatsApp,
           * domínio) e não pode travar por causa disso. Cai no crédito da
           * plataforma, uma vez, com aviso — e não silenciosamente.
           */
          if (
            conta.fonte !== "propria" ||
            algumTextoEmitido ||
            e instanceof ErroIA ||
            !ehErroDeChaveIndisponivel(e)
          ) {
            throw e;
          }

          const respaldo = await contaDeRespaldo(site.org_id, conta.saldo);
          const permissao = podeGastar(respaldo);
          if (!permissao.ok) {
            throw new Error(
              "Sua chave da Anthropic recusou a chamada (sem crédito ou inválida), e você também não tem crédito da plataforma no momento. Corrija a chave ou compre créditos na tela de Créditos.",
            );
          }

          contaEfetiva = respaldo;
          linha({
            t: "aviso",
            v: "Sua chave da Anthropic recusou a chamada (sem crédito ou inválida). Usamos o crédito da plataforma desta vez para não travar seu trabalho.",
          });
          resposta = await conversarComIA({
            key: respaldo.anthropic!,
            modelo: modeloValido(site.modelo),
            system: SYSTEM_CONSTRUTOR,
            mensagens,
            htmlAtual: site.html || null,
            onTexto,
          });
        }

        const custo = await cobrar({
          conta: contaEfetiva,
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
          // A tela mostra o custo desta geração e o saldo que sobrou. Reflete a
          // conta que REALMENTE pagou — a própria ou, no respaldo, a nossa.
          custo: contaEfetiva.fonte === "plataforma" ? emDolar(custo) : null,
          saldo: contaEfetiva.fonte === "plataforma" ? emDolar(Math.max(0, contaEfetiva.saldo - custo)) : null,
        });
      } catch (e) {
        /*
         * Recusa e corte por tamanho acontecem DEPOIS de a IA trabalhar: a
         * Anthropic cobra esses tokens de qualquer jeito. Não debitar aqui
         * seria nós pagando o erro do cliente.
         */
        if (e instanceof ErroIA) {
          await cobrar({
            conta: contaEfetiva,
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
