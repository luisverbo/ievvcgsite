import { NextResponse } from "next/server";
import { agenteDaRequisicao } from "@/lib/agente/token";
import { createAdminClient } from "@/lib/supabase/admin";
import { pontuarEGravar } from "@/lib/prospeccao/gravar";
import { classificarResposta, classificarPorPalavras } from "@/lib/prospeccao/classificar";
import { dispararFechador } from "@/lib/prospeccao/fechador";
import { enfileirarApresentacao, TIPO_APRESENTACAO } from "@/lib/prospeccao/gancho";
import { montarResumoDoDia, resumoDevido, resumoFalhou } from "@/lib/prospeccao/resumo";
import { prepararFollowups } from "@/lib/prospeccao/followup";
import { funcaoLigada } from "@/lib/painel/flags";
import { orgPodeUsar } from "@/lib/painel/permissoes";
import { tetoEnviosDaOrg } from "@/lib/painel/teste";
import { ARQUIVOS_DO_AGENTE, VERSAO_AGENTE } from "@/lib/agente/pacote";
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

/*
 * Todo id vindo do agente passa por aqui ANTES de ser usado.
 *
 * Não é excesso de zelo: alguns ids entram em CAMINHO de Storage
 * (`${org}/instagram/${id}/…`) — um id forjado como "../../outra-org/x"
 * escaparia da pasta da própria organização. Com o formato UUID garantido,
 * o caminho nunca sai do prefixo do dono do token.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const idValido = (v: unknown): string | null => (UUID.test(String(v ?? "")) ? String(v) : null);

// Teto por foto/print. O agente honesto manda imagens de celular (< 1MB);
// acima disso é erro ou abuso — e Storage cheio é conta nossa.
const MAX_IMAGEM_BYTES = 4 * 1024 * 1024;

/*
 * O envio está pausado no painel?
 *
 * Consulta própria e tolerante de propósito: a coluna é de migração nova, e
 * na dúvida a resposta é NÃO — um erro de SQL não pode calar o envio de uma
 * conta que nunca pediu pausa.
 */
async function envioPausado(orgId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("prospeccao_config")
      .select("envio_pausado")
      .eq("org_id", orgId)
      .maybeSingle();
    if (error) return false;
    return (data as { envio_pausado: boolean | null } | null)?.envio_pausado === true;
  } catch {
    return false;
  }
}

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
        return j({ ok: true, agente: agente.nome, versao: VERSAO_AGENTE });

      /* ------------------------ versão e atualização ---------------------- */
      /*
       * O agente conta a versão que está rodando e pergunta se o dono pediu
       * atualização. O pedido é limpo AQUI, ao ser entregue: se a atualização
       * falhar na ponta, o dono clica de novo — melhor isso do que um agente
       * tentando reiniciar em laço a cada 5 minutos.
       *
       * Tolerante às colunas novas: sem a migração, o agente segue trabalhando
       * e só a tela deixa de saber a versão dele.
       */
      case "versao": {
        const local = String(corpo.versao ?? "").slice(0, 40) || null;
        let atualizar = false;
        try {
          const { data: linha } = await admin
            .from("agentes")
            .select("atualizar_pedido")
            .eq("id", agente.id)
            .maybeSingle();
          atualizar = (linha as { atualizar_pedido: boolean | null } | null)?.atualizar_pedido === true;
          await admin
            .from("agentes")
            .update({
              versao: local,
              versao_em: agora(),
              ...(atualizar ? { atualizar_pedido: false } : {}),
            })
            .eq("id", agente.id);
        } catch {
          /* migração pendente — sem versão na tela, e só. */
        }
        return j({ atual: VERSAO_AGENTE, atualizar });
      }

      /*
       * Os arquivos do agente, para a instalação por zip se atualizar por
       * cima. Autenticado pelo token como tudo aqui — e o pacote não carrega
       * .env nem segredo nenhum: é o mesmo código aberto que vai no zip.
       */
      case "pacote":
        return j({ arquivos: ARQUIVOS_DO_AGENTE, versao: VERSAO_AGENTE });

      /* --------------------------- fila de buscas ------------------------- */
      case "proxima_tarefa": {
        /*
         * Conta sem prospecção (teste vencido, assinatura suspensa) não
         * recebe trabalho: o agente continua ligado e inofensivo, e a fila
         * espera a assinatura. A trava é aqui, no servidor — o agente não
         * sabe de plano nenhum.
         */
        if (!(await orgPodeUsar(org, "prospeccao"))) return j({ tarefa: null });

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
        const tarefa = (presa as Record<string, unknown>[] | null)?.[0] ?? null;

        /*
         * Os filtros vêm numa consulta À PARTE, e não no select acima, por
         * uma razão prática: `filtros` é coluna nova (migração 2026-08-24) e,
         * enquanto ela não existe, pedi-la no RETURNING derrubaria o próprio
         * UPDATE — a tarefa nunca sairia de "pendente" e a fila travava.
         * Aqui, se a coluna faltar, a busca só roda sem filtro, como antes.
         */
        if (tarefa) {
          const { data: extra } = await admin
            .from("prospeccao_tarefas")
            .select("filtros")
            .eq("id", candidata.id)
            .maybeSingle();
          if (extra) tarefa.filtros = (extra as { filtros?: unknown }).filtros ?? null;
        }
        return j({ tarefa });
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
      case "ja_existem": {
        /*
         * "Destes ids, quais o cliente já tem?" — para o agente pular as
         * repetidas sem abrir a ficha. Só ids da própria organização, e um
         * lote por vez: uma busca real traz até 150 links.
         */
        const pedidos = Array.isArray(corpo.fonte_ids)
          ? (corpo.fonte_ids as unknown[]).map(String).filter(Boolean).slice(0, 300)
          : [];
        if (pedidos.length === 0) return j({ existentes: [] });
        const { data: achados } = await admin
          .from("prospeccao")
          .select("fonte_id")
          .eq("org_id", org)
          .eq("fonte", "google")
          .in("fonte_id", pedidos);
        return j({
          existentes: ((achados as { fonte_id: string }[] | null) ?? []).map((a) => a.fonte_id),
        });
      }

      case "gravar_empresas": {
        // A pontuação roda aqui, no servidor: é a régua que decide quem vale a
        // pena abordar, e não pode depender da versão do agente que o cliente
        // tem instalada.
        // Teto de lote: uma busca real traz até ~120; mil de uma vez é abuso.
        const empresas = Array.isArray(corpo.empresas)
          ? (corpo.empresas as EmpresaEncontrada[]).slice(0, 300)
          : [];
        const resumo = await pontuarEGravar(
          org,
          String(corpo.nicho ?? "").slice(0, 80),
          String(corpo.local ?? "").slice(0, 120),
          empresas,
        );
        return j(resumo);
      }

      /* ------------------------------ instagram --------------------------- */
      case "prospecto_ig": {
        const id = idValido(corpo.id);
        if (!id) return j({ prospecto: null });
        const { data } = await admin
          .from("prospeccao")
          .select("id, nome, instagram, website")
          .eq("id", id)
          .eq("org_id", org)
          .maybeSingle();
        return j({ prospecto: data ?? null });
      }

      case "gravar_instagram": {
        const id = idValido(corpo.id);
        if (!id) return j({ erro: "Id inválido." }, 400);
        const status = String(corpo.status ?? "erro").slice(0, 30);

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
          // Teto ANTES de decodificar: decodificar 100MB de base64 para então
          // recusar já seria o estrago de memória feito.
          if (typeof foto.base64 !== "string" || foto.base64.length * 0.75 > MAX_IMAGEM_BYTES) {
            continue;
          }
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

      /* ------------------------- estúdio de vídeos -------------------------- */
      /*
       * A fila de vídeo é escopada pela organização do token, como todo o
       * resto — e como só o admin CRIA projeto (ehAdmin nas actions), na
       * prática só a organização dele tem fila.
       *
       * Consequência prática para quem roda dois agentes: o do PC costuma
       * estar logado numa conta de teste, e a fila de vídeo é da conta
       * ADMIN. Por isso o agente aceita um token separado só para o Estúdio
       * (PAGINAPRO_TOKEN_ESTUDIO no .env) — assim uma máquina só atende as
       * duas contas sem misturar nada.
       *
       * O roteamento entre VPS e PC não precisa de código: quem tem MPT
       * instalado é que pergunta por estes jobs.
       */
      /*
       * Transcrição pendente. O agente do dono busca com IP residencial —
       * do servidor, o YouTube devolve tela de consentimento e o sintoma
       * mentia ("este vídeo não tem legenda").
       *
       * Só entrega quem ainda não foi tentado, ou foi há mais de um dia:
       * vídeo realmente sem legenda não pode virar tentativa eterna.
       */
      case "transcricao_pendente": {
        const ontem = new Date(Date.now() - 86_400_000).toISOString();
        const { data } = await admin
          .from("estudio_achados")
          .select("id, video_id, titulo")
          .eq("org_id", org)
          .eq("fonte", "youtube")
          .is("transcricao", null)
          .or(`transcricao_tentada_em.is.null,transcricao_tentada_em.lt.${ontem}`)
          .order("score_outlier", { ascending: false, nullsFirst: false })
          .limit(1);
        return j({ achado: (data as unknown[] | null)?.[0] ?? null });
      }

      case "transcricao_gravar": {
        const id = idValido(corpo.id);
        if (!id) return j({ erro: "Id inválido." }, 400);
        const texto = String(corpo.texto ?? "").trim().slice(0, 12_000);
        await admin
          .from("estudio_achados")
          .update({
            // Sem texto marca a tentativa: não volta na fila hoje de novo.
            ...(texto.length > 40 ? { transcricao: texto } : {}),
            transcricao_tentada_em: agora(),
          })
          .eq("id", id)
          .eq("org_id", org);
        return j({ ok: true });
      }

      case "video_proximo": {
        const { data: fila } = await admin
          .from("estudio_projetos")
          .select("id")
          .eq("org_id", org)
          .eq("status", "na_fila")
          .order("created_at")
          .limit(1);
        const candidato = (fila as { id: string }[] | null)?.[0];
        if (!candidato) return j({ projeto: null });

        // O filtro no UPDATE é o que impede duas máquinas de pegarem o mesmo.
        const { data: presa } = await admin
          .from("estudio_projetos")
          .update({
            status: "gerando",
            agente: agente.nome,
            iniciado_em: agora(),
            progresso: "preparando",
          })
          .eq("id", candidato.id)
          .eq("org_id", org)
          .eq("status", "na_fila")
          .select("id, titulo, roteiro, termos, formato_16x9, duracao_alvo_s, musica, musica_volume");
        return j({ projeto: (presa as unknown[] | null)?.[0] ?? null });
      }

      case "video_progresso": {
        await admin
          .from("estudio_projetos")
          .update({ progresso: String(corpo.progresso ?? "").slice(0, 120) })
          .eq("id", String(corpo.id))
          .eq("org_id", org)
          .eq("status", "gerando");
        return j({ ok: true });
      }

      case "video_fim": {
        const id = idValido(corpo.id);
        if (!id) return j({ erro: "Id inválido." }, 400);
        await admin
          .from("estudio_projetos")
          .update(
            corpo.ok
              ? {
                  status: "pronto",
                  arquivo: String(corpo.arquivo ?? "").slice(0, 500) || null,
                  arquivo_16x9: String(corpo.arquivo_16x9 ?? "").slice(0, 500) || null,
                  progresso: null,
                  erro: null,
                  concluido_em: agora(),
                }
              : {
                  status: "erro",
                  erro: String(corpo.erro ?? "falhou").slice(0, 400),
                  progresso: null,
                  concluido_em: agora(),
                },
          )
          .eq("id", id)
          .eq("org_id", org);
        return j({ ok: true });
      }

      /* ------------------------------ espelho ------------------------------ */
      case "gravar_espelho": {
        const id = idValido(corpo.id);
        if (!id) return j({ ok: false, erro: "Id inválido." });
        if (!corpo.ok) {
          // Print que falhou não apaga um que já deu certo — só encerra a tarefa.
          return j({ ok: true });
        }
        const b64 = String(corpo.base64 ?? "");
        if (b64.length * 0.75 > MAX_IMAGEM_BYTES) return j({ ok: false, erro: "Print grande demais." });
        const buf = Buffer.from(b64, "base64");
        if (buf.byteLength < 10_000) return j({ ok: false, erro: "Print vazio ou corrompido." });

        // O prospecto tem que ser da organização do token ANTES do upload —
        // senão sobraria arquivo órfão gravado por um id que não é de ninguém.
        const { count: meu } = await admin
          .from("prospeccao")
          .select("id", { count: "exact", head: true })
          .eq("id", id)
          .eq("org_id", org);
        if ((meu ?? 0) === 0) return j({ ok: false, erro: "Empresa não encontrada." });

        const caminho = `${org}/espelho/${id}-${Date.now()}.jpg`;
        const { error: eUp } = await admin.storage
          .from("midias")
          .upload(caminho, buf, { contentType: "image/jpeg", upsert: true });
        if (eUp) return j({ ok: false, erro: eUp.message });
        const { data: pub } = admin.storage.from("midias").getPublicUrl(caminho);

        const { error: eDb } = await admin
          .from("prospeccao")
          .update({ espelho_url: pub.publicUrl, espelho_em: agora() })
          .eq("id", id)
          .eq("org_id", org);
        if (eDb) return j({ ok: false, erro: eDb.message });
        return j({ ok: true });
      }

      /* ------------------------------ abordagem --------------------------- */
      case "abordagem_estado": {
        /*
         * Antes de contar a fila, enfileira os follow-ups vencidos — assim
         * eles já entram na mesma resposta e o agente sai mandando. A função
         * tem relógio próprio (uma varredura por hora) e engole os próprios
         * erros: nunca atrasa nem derruba a checagem de estado.
         */
        await prepararFollowups(org);

        const { data: cfgRaw } = await admin
          .from("prospeccao_config")
          .select("org_id, limite_diario, intervalo_min_s, intervalo_max_s, whatsapp_status, desconectar_pedido")
          .eq("org_id", org)
          .maybeSingle();

        // O freio de mão. Em select próprio e tolerante: a coluna é de
        // migração nova, e pedi-la junto derrubaria o estado inteiro em quem
        // ainda não rodou o SQL — parando o envio de quem nem pausou nada.
        // Sem prospecção no plano (teste vencido, suspenso), vale como pausado.
        const pausado = (await envioPausado(org)) || !(await orgPodeUsar(org, "prospeccao"));

        // Teste grátis: o teto de envios é do plano, por cima do que o
        // cliente configurou. O agente recebe o menor dos dois.
        const tetoPlano = await tetoEnviosDaOrg(org);

        const inicioDia = new Date();
        inicioDia.setHours(0, 0, 0, 0);
        /*
         * O limite diário conta CONTATOS: a apresentação de quem respondeu ao
         * gancho é continuação de conversa, não contato novo, e fica de fora
         * da conta — senão cada resposta boa gastaria duas vagas da cota.
         */
        const { count } = await admin
          .from("prospeccao_mensagens")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org)
          .eq("status", "enviada")
          .neq("tipo", TIPO_APRESENTACAO)
          .gte("enviada_em", inicioDia.toISOString());

        const { count: pendentes } = await admin
          .from("prospeccao_mensagens")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org)
          .eq("status", "pendente")
          .eq("modo", "auto");

        // Apresentações esperando: o agente as manda mesmo com a cota cheia.
        const { count: continuacoes } = await admin
          .from("prospeccao_mensagens")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org)
          .eq("status", "pendente")
          .eq("modo", "auto")
          .eq("tipo", TIPO_APRESENTACAO);

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

        const cfgBase = (cfgRaw as { limite_diario: number } | null) ?? {
          org_id: org,
          limite_diario: 20,
          intervalo_min_s: 45,
          intervalo_max_s: 150,
          whatsapp_status: "desconectado",
          desconectar_pedido: false,
        };
        return j({
          // Hora do resumo diário? O agente abre o WhatsApp também por isso.
          resumoDevido: await resumoDevido(org),
          config: {
            ...cfgBase,
            limite_diario:
              tetoPlano === null ? cfgBase.limite_diario : Math.min(cfgBase.limite_diario, tetoPlano),
          },
          enviadasHoje: count ?? 0,
          // Pausado, a fila some do ponto de vista do agente: ele não abre o
          // WhatsApp só para enviar, mas continua escutando e conectando.
          pendentes: pausado ? 0 : (pendentes ?? 0),
          aguardando,
          continuacoes: pausado ? 0 : (continuacoes ?? 0),
          pausado,
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
          .select("id, prospecto_id, tipo, modo")
          .eq("org_id", org)
          .eq("status", "enviada")
          .eq("telefone", telefone)
          .is("resposta_em", null)
          .order("enviada_em", { ascending: false })
          .limit(1);
        const msg = (
          msgRaw as { id: string; prospecto_id: string; tipo: string | null; modo: string }[] | null
        )?.[0];
        // Sem mensagem esperando: resposta duplicada ou conversa antiga. Nada a fazer.
        if (!msg) return j({ ok: true, classe: null });

        /*
         * Resposta ao GANCHO: o lead só disse "tudo bem e você?" — ainda não
         * é conversa para o vendedor assumir. Guarda a resposta, e coloca a
         * APRESENTAÇÃO na fila; o lead continua "contactado" e só vira
         * "respondeu" quando responder à apresentação. Só a recusa fura
         * isso: "não quero" é opt-out, venha em que etapa vier.
         */
        if (msg.tipo === "gancho") {
          const recusou = classificarPorPalavras(texto) === "recusa";
          await admin
            .from("prospeccao_mensagens")
            .update({ resposta_texto: texto, resposta_em: agora(), resposta_classe: recusou ? "recusa" : "outro" })
            .eq("id", msg.id)
            .eq("org_id", org);
          if (recusou) {
            await admin
              .from("prospeccao")
              .update({ status: "respondeu", nao_perturbar: true })
              .eq("id", msg.prospecto_id)
              .eq("org_id", org)
              .neq("status", "fechou");
            return j({ ok: true, classe: "recusa" });
          }
          const entrou = await enfileirarApresentacao(
            org,
            msg.prospecto_id,
            telefone,
            msg.modo === "semi" ? "semi" : "auto",
          );
          return j({ ok: true, classe: entrou ? "gancho" : null });
        }

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

      /*
       * O resumo diário do dono. Montar já RESERVA o dia (dois agentes da
       * mesma conta não mandam em dobro); se o envio falhar na ponta, o
       * agente chama resumo_falhou e a vez volta.
       */
      case "resumo_pendente": {
        const resumo = await montarResumoDoDia(org);
        return j({ resumo });
      }

      case "resumo_falhou": {
        await resumoFalhou(org);
        return j({ ok: true });
      }

      case "zap_estado": {
        /*
         * O QR vira <img src> no painel do dono: só data-URI de imagem passa,
         * com teto de tamanho — não é lugar de URL externa nem de lixo de 50MB.
         */
        let qr = corpo.qr as string | null | undefined;
        if (typeof qr === "string" && (!qr.startsWith("data:image/") || qr.length > 3_000_000)) {
          qr = null;
        }
        const estados = ["desconectado", "aguardando_qr", "conectado", "erro"];
        const estado = String(corpo.estado ?? "desconectado");
        await admin.from("prospeccao_config").upsert(
          {
            org_id: org,
            whatsapp_status: estados.includes(estado) ? estado : "erro",
            whatsapp_mensagem: ((corpo.mensagem as string) ?? null)?.slice(0, 300) ?? null,
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
        /*
         * A trava da pausa mora AQUI, e não no agente, de propósito: assim
         * "Parar" para o envio na hora mesmo em quem ainda não atualizou o
         * programa no computador. Sem mensagem entregue, não há o que enviar.
         */
        if (await envioPausado(org)) return j({ mensagem: null });
        if (!(await orgPodeUsar(org, "prospeccao"))) return j({ mensagem: null });

        /*
         * Apresentação primeiro: o lead respondeu ao gancho e está com o
         * WhatsApp na mão AGORA. Ela não espera atrás de vinte contatos novos.
         */
        const { data: apres } = await admin
          .from("prospeccao_mensagens")
          .select("id, prospecto_id, telefone, texto")
          .eq("org_id", org)
          .eq("status", "pendente")
          .eq("modo", "auto")
          .eq("tipo", TIPO_APRESENTACAO)
          .order("created_at")
          .limit(1);
        const apresentacao = (apres as unknown[] | null)?.[0];
        if (apresentacao) return j({ mensagem: apresentacao });

        /*
         * Contato novo só dentro da cota. O agente já confere isso antes de
         * pedir — mas com a apresentação passando por cima da cota, o servidor
         * é quem garante que a passagem não leva os contatos novos junto.
         */
        const { data: cfgLim } = await admin
          .from("prospeccao_config")
          .select("limite_diario")
          .eq("org_id", org)
          .maybeSingle();
        const limiteCfg = (cfgLim as { limite_diario: number } | null)?.limite_diario ?? 20;
        // Teste grátis: o teto do plano vale por cima do configurado.
        const tetoDoPlano = await tetoEnviosDaOrg(org);
        const limite = tetoDoPlano === null ? limiteCfg : Math.min(limiteCfg, tetoDoPlano);
        const inicio = new Date();
        inicio.setHours(0, 0, 0, 0);
        const { count: contatosHoje } = await admin
          .from("prospeccao_mensagens")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org)
          .eq("status", "enviada")
          .neq("tipo", TIPO_APRESENTACAO)
          .gte("enviada_em", inicio.toISOString());
        if ((contatosHoje ?? 0) >= limite) return j({ mensagem: null });

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

        /*
         * O veredito do próprio WhatsApp sobre o número — a única validação
         * que existe de verdade. Formato de celular é palpite; isto é resposta.
         *
         * O prospecto vem da linha da mensagem, e não do corpo do pedido, por
         * dois motivos: no caminho do erro o agente nunca mandou esse campo, e
         * agente velho continuaria sem mandar. Assim funciona nos dois.
         *
         * Falha em silêncio de propósito: enquanto a migração 2026-08-25 não
         * roda, a coluna não existe — e não registrar isso não pode impedir a
         * mensagem de ser marcada como enviada.
         */
        const anotarWhatsapp = async (existe: boolean) => {
          const { data: linha } = await admin
            .from("prospeccao_mensagens")
            .select("prospecto_id")
            .eq("id", id)
            .eq("org_id", org)
            .maybeSingle();
          const alvo = (linha as { prospecto_id: string | null } | null)?.prospecto_id;
          if (!alvo) return;
          await admin
            .from("prospeccao")
            .update({ whatsapp_ok: existe })
            .eq("id", alvo)
            .eq("org_id", org);
        };

        if (corpo.ok) {
          // A conversa abriu e a mensagem saiu: o número existe.
          await anotarWhatsapp(true).catch(() => {});
        } else if (corpo.semWhatsapp) {
          await anotarWhatsapp(false).catch(() => {});
        }

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
