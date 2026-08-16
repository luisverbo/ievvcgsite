import { NextResponse } from "next/server";
import { agenteDaRequisicao } from "@/lib/agente/token";
import { createAdminClient } from "@/lib/supabase/admin";
import { pontuarEGravar } from "@/lib/prospeccao/gravar";
import { classificarResposta } from "@/lib/prospeccao/classificar";
import { dispararFechador } from "@/lib/prospeccao/fechador";
import { funcaoLigada } from "@/lib/painel/flags";
import type { EmpresaEncontrada } from "@/lib/prospeccao/tipos";

/*
 * A porta do agente.
 *
 * Antes o agente falava direto com o Supabase usando a service_role. Isso
 * servia enquanto o único agente era o do dono; entregar essa chave a um
 * cliente seria entregar o banco de TODOS os clientes.
 *
 * Agora ele bate aqui com um token, e cada ação já nasce presa à organização
 * dona daquele token — não existe caminho para pedir dado de outra. Uma porta
 * só, e portanto um lugar só para auditar quem pode o quê.
 */

export const maxDuration = 300;

const agora = () => new Date().toISOString();
const j = (corpo: unknown, status = 200) => NextResponse.json(corpo, { status });

export async function POST(req: Request) {
  const agente = await agenteDaRequisicao(req);
  if (!agente) return j({ erro: "Token inválido ou desativado." }, 401);

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return j({ erro: "Corpo inválido." }, 400);
  }

  const admin = createAdminClient();
  const org = agente.orgId;
  const acao = String(corpo.acao ?? "");

  try {
    switch (acao) {
      /* ------------------------------ presença ---------------------------- */
      case "ping":
        return j({ ok: true, agente: agente.nome });

      /* --------------------------- fila de buscas ------------------------- */
      case "proxima_tarefa": {
        // O filtro status='pendente' no UPDATE é o que impede dois agentes da
        // mesma organização de pegarem a mesma tarefa.
        const { data: fila } = await admin
          .from("prospeccao_tarefas")
          .select("id")
          .eq("org_id", org)
          .eq("status", "pendente")
          .order("created_at")
          .limit(1);
        const candidata = (fila as { id: string }[] | null)?.[0];
        if (!candidata) return j({ tarefa: null });

        const { data: presa } = await admin
          .from("prospeccao_tarefas")
          .update({ status: "rodando", agente: agente.nome, iniciada_em: agora() })
          .eq("id", candidata.id)
          .eq("status", "pendente")
          .select("id, tipo, nicho, local, limite, prospecto_id");
        return j({ tarefa: (presa as unknown[] | null)?.[0] ?? null });
      }

      case "progresso": {
        await admin
          .from("prospeccao_tarefas")
          .update({ progresso: Number(corpo.progresso) || 0, total: Number(corpo.total) || 0 })
          .eq("id", String(corpo.id))
          .eq("org_id", org);
        return j({ ok: true });
      }

      case "fim_tarefa": {
        await admin
          .from("prospeccao_tarefas")
          .update({
            status: String(corpo.status ?? "concluida"),
            erro: (corpo.erro as string) ?? null,
            gravadas: Number(corpo.gravadas) || 0,
            progresso: Number(corpo.progresso) || 0,
            concluida_em: agora(),
          })
          .eq("id", String(corpo.id))
          .eq("org_id", org);
        return j({ ok: true });
      }

      /* --------------------------- empresas achadas ----------------------- */
      case "gravar_empresas": {
        // A pontuação roda aqui, no servidor: é a régua que decide quem vale a
        // pena abordar, e não pode depender da versão do agente que o cliente
        // tem instalada.
        const resumo = await pontuarEGravar(
          org,
          String(corpo.nicho ?? ""),
          String(corpo.local ?? ""),
          (corpo.empresas as EmpresaEncontrada[]) ?? [],
        );
        return j(resumo);
      }

      /* ------------------------------ instagram --------------------------- */
      case "prospecto_ig": {
        const { data } = await admin
          .from("prospeccao")
          .select("id, nome, instagram, website")
          .eq("id", String(corpo.id))
          .eq("org_id", org)
          .maybeSingle();
        return j({ prospecto: data ?? null });
      }

      case "gravar_instagram": {
        const id = String(corpo.id);
        const status = String(corpo.status ?? "erro");

        if (status !== "ok") {
          await admin
            .from("prospeccao")
            .update({ ig_status: status, ig_erro: (corpo.erro as string) ?? null, ig_capturado_em: agora() })
            .eq("id", id)
            .eq("org_id", org);
          return j({ ok: true, fotos: 0 });
        }

        // As fotos chegam em base64 e são gravadas no nosso Storage aqui: o
        // agente não tem (nem pode ter) acesso de escrita ao bucket.
        const dados = (corpo.dados ?? {}) as {
          nome?: string;
          bio?: string;
          seguidores?: number;
          posts?: number;
        };
        const recebidas = (corpo.fotos as { base64: string; legenda?: string }[] | undefined) ?? [];
        const fotos: { url: string; legenda?: string }[] = [];

        for (const [i, foto] of recebidas.slice(0, 9).entries()) {
          const buf = Buffer.from(foto.base64, "base64");
          if (buf.byteLength < 8_000) continue; // ícone ou imagem de erro
          const caminho = `${org}/instagram/${id}/${i}-${Date.now()}.jpg`;
          const { error } = await admin.storage
            .from("midias")
            .upload(caminho, buf, { contentType: "image/jpeg", upsert: true });
          if (error) continue;
          const { data: pub } = admin.storage.from("midias").getPublicUrl(caminho);
          fotos.push({ url: pub.publicUrl, legenda: foto.legenda });
        }

        await admin
          .from("prospeccao")
          .update({
            ig_nome: dados.nome ?? null,
            ig_bio: dados.bio ?? null,
            ig_seguidores: dados.seguidores ?? null,
            ig_posts: dados.posts ?? null,
            ig_fotos: fotos,
            ig_status: "ok",
            ig_erro: fotos.length === 0 ? "Perfil lido, mas nenhuma foto pôde ser baixada." : null,
            ig_capturado_em: agora(),
          })
          .eq("id", id)
          .eq("org_id", org);

        return j({ ok: true, fotos: fotos.length });
      }

      /* ------------------------------ abordagem --------------------------- */
      case "abordagem_estado": {
        const { data: cfgRaw } = await admin
          .from("prospeccao_config")
          .select("org_id, limite_diario, intervalo_min_s, intervalo_max_s, whatsapp_status, desconectar_pedido")
          .eq("org_id", org)
          .maybeSingle();

        const inicioDia = new Date();
        inicioDia.setHours(0, 0, 0, 0);
        const { count } = await admin
          .from("prospeccao_mensagens")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org)
          .eq("status", "enviada")
          .gte("enviada_em", inicioDia.toISOString());

        const { count: pendentes } = await admin
          .from("prospeccao_mensagens")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org)
          .eq("status", "pendente")
          .eq("modo", "auto");

        /*
         * `aguardando` = de quantos números esperamos resposta. É o que faz o
         * agente abrir o WhatsApp mesmo sem fila de envio — para ESCUTAR.
         * Com a função desligada no Admin, devolve 0 e o agente nem tenta.
         */
        let aguardando = 0;
        if (await funcaoLigada("escuta")) {
          const { count: c } = await admin
            .from("prospeccao_mensagens")
            .select("id", { count: "exact", head: true })
            .eq("org_id", org)
            .eq("status", "enviada")
            .is("resposta_em", null)
            .gte("enviada_em", new Date(Date.now() - 14 * 86_400_000).toISOString());
          aguardando = c ?? 0;
        }

        return j({
          config: cfgRaw ?? {
            org_id: org,
            limite_diario: 20,
            intervalo_min_s: 45,
            intervalo_max_s: 150,
            whatsapp_status: "desconectado",
            desconectar_pedido: false,
          },
          enviadasHoje: count ?? 0,
          pendentes: pendentes ?? 0,
          aguardando,
        });
      }

      /*
       * De quem estamos esperando resposta — os números que o agente vai
       * conferir na lista de conversas. Só mensagens dos últimos 14 dias:
       * resposta depois disso é rara e conferir para sempre seria varrer a
       * lista inteira todo dia.
       */
      case "aguardando_resposta": {
        if (!(await funcaoLigada("escuta"))) return j({ numeros: [] });
        const { data } = await admin
          .from("prospeccao_mensagens")
          .select("telefone")
          .eq("org_id", org)
          .eq("status", "enviada")
          .is("resposta_em", null)
          .gte("enviada_em", new Date(Date.now() - 14 * 86_400_000).toISOString())
          .order("enviada_em", { ascending: false })
          .limit(60);
        const numeros = [...new Set(((data as { telefone: string }[] | null) ?? []).map((m) => m.telefone))];
        return j({ numeros });
      }

      /*
       * O lead respondeu. Guarda o texto na mensagem que originou a conversa,
       * classifica com a IA e mexe no prospecto: vira "respondeu" — e recusa
       * vira opt-out DEFINITIVO (nao_perturbar), que nenhuma fila futura pode
       * atropelar.
       */
      case "resposta_recebida": {
        const telefone = String(corpo.telefone ?? "").replace(/\D/g, "");
        const texto = String(corpo.texto ?? "").slice(0, 800);
        if (!telefone || !texto) return j({ erro: "Faltou telefone ou texto." }, 400);

        const { data: msgRaw } = await admin
          .from("prospeccao_mensagens")
          .select("id, prospecto_id")
          .eq("org_id", org)
          .eq("status", "enviada")
          .eq("telefone", telefone)
          .is("resposta_em", null)
          .order("enviada_em", { ascending: false })
          .limit(1);
        const msg = (msgRaw as { id: string; prospecto_id: string }[] | null)?.[0];
        // Sem mensagem esperando: resposta duplicada ou conversa antiga. Nada a fazer.
        if (!msg) return j({ ok: true, classe: null });

        const classe = await classificarResposta(org, texto);

        await admin
          .from("prospeccao_mensagens")
          .update({ resposta_texto: texto, resposta_em: agora(), resposta_classe: classe })
          .eq("id", msg.id)
          .eq("org_id", org);

        await admin
          .from("prospeccao")
          .update({
            status: "respondeu",
            ...(classe === "recusa" ? { nao_perturbar: true } : {}),
          })
          .eq("id", msg.prospecto_id)
          .eq("org_id", org)
          // Fechou é estado final: uma mensagem atrasada não pode rebaixá-lo.
          .neq("status", "fechou");

        /*
         * Interesse aciona o Fechador — que decide sozinho se faz algo,
         * conforme o nível configurado, o teto do mês e o interruptor do
         * Admin. Aguardamos aqui de propósito: a rota tem 300s, a geração
         * leva 1-2 min, e o agente está num intervalo de escuta mesmo.
         */
        if (classe === "interesse") {
          await dispararFechador(org, msg.prospecto_id);
        }

        return j({ ok: true, classe });
      }

      case "zap_estado": {
        const qr = corpo.qr as string | null | undefined;
        await admin.from("prospeccao_config").upsert(
          {
            org_id: org,
            whatsapp_status: String(corpo.estado ?? "desconectado"),
            whatsapp_mensagem: (corpo.mensagem as string) ?? null,
            ...(qr !== undefined ? { whatsapp_qr: qr } : {}),
            whatsapp_em: agora(),
          },
          { onConflict: "org_id" },
        );
        return j({ ok: true });
      }

      case "zap_desconectado": {
        await admin
          .from("prospeccao_config")
          .update({
            desconectar_pedido: false,
            whatsapp_status: "desconectado",
            whatsapp_qr: null,
            whatsapp_mensagem: "Desconectado. Clique em Conectar para entrar com outro número.",
            whatsapp_em: agora(),
          })
          .eq("org_id", org);
        return j({ ok: true });
      }

      case "proxima_mensagem": {
        const { data } = await admin
          .from("prospeccao_mensagens")
          .select("id, prospecto_id, telefone, texto")
          .eq("org_id", org)
          .eq("status", "pendente")
          .eq("modo", "auto")
          .order("created_at")
          .limit(1);
        return j({ mensagem: (data as unknown[] | null)?.[0] ?? null });
      }

      case "fim_mensagem": {
        const id = String(corpo.id);
        if (corpo.ok) {
          await admin
            .from("prospeccao_mensagens")
            .update({ status: "enviada", enviada_em: agora(), agente: agente.nome })
            .eq("id", id)
            .eq("org_id", org);
          if (corpo.prospecto_id) {
            // Só sobe de "novo" para "contactado". A entrega do FECHAMENTO
            // chega aqui também — e não pode rebaixar quem já "respondeu".
            await admin
              .from("prospeccao")
              .update({ status: "contactado", contactado_em: agora() })
              .eq("id", String(corpo.prospecto_id))
              .eq("org_id", org)
              .eq("status", "novo");
          }
        } else {
          await admin
            .from("prospeccao_mensagens")
            .update({
              status: corpo.semWhatsapp ? "sem_whatsapp" : "erro",
              erro: (corpo.erro as string) ?? null,
            })
            .eq("id", id)
            .eq("org_id", org);
        }
        return j({ ok: true });
      }

      default:
        return j({ erro: `Ação desconhecida: ${acao}` }, 400);
    }
  } catch (e) {
    console.error("[api/agente]", acao, (e as Error).message);
    return j({ erro: (e as Error).message.slice(0, 300) }, 500);
  }
}
