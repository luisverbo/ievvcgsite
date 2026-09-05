"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { slugify } from "@/lib/format";
import { podeUsar } from "@/lib/painel/permissoes";
import { acharNicho, nichoLivreValido } from "@/lib/prospeccao/nichos";
import { normalizarFiltros, resumoFiltros, temFiltro } from "@/lib/prospeccao/filtros";
import { IG_FILA_MAX, IG_LIMITE_DIA } from "@/lib/prospeccao/instagram";
import { montarBriefingDoProspecto } from "@/lib/prospeccao/briefing";
import { lerPlanilha, idDaLinha } from "@/lib/prospeccao/importar";
import { funcaoLigada } from "@/lib/painel/flags";
import { codigoSeguro } from "@/lib/codigo";
import type { ProspectoRow, StatusProspecto } from "@/lib/prospeccao/tipos";

export type BuscaState = { ok?: string; error?: string } | undefined;

/* ---------------------- fila do agente (Google Maps) ---------------------- */
// O painel só enfileira: quem executa é o agente rodando na VPS ou no seu
// computador. Ele consulta esta fila — nunca recebe conexão de fora.
export async function enfileirarBuscaGoogle(
  _prev: BuscaState,
  formData: FormData,
): Promise<BuscaState> {
  if (!(await podeUsar("prospeccao"))) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };

  const escolhido = String(formData.get("nicho") ?? "").trim();
  const livre = String(formData.get("nicho_livre") ?? "").trim();
  // "__outro__" no seletor = o ramo veio digitado. O Google busca por texto,
  // então qualquer ramo serve — a validação só barra o que não é um ramo.
  const nicho = escolhido === "__outro__" ? livre : escolhido;
  const local = String(formData.get("local") ?? "").trim();
  // 120 é o que o Google Maps lista de verdade numa busca; pedir mais só
  // faria o agente rolar uma lista que acabou.
  let limite = Math.min(120, Math.max(5, Number(formData.get("limite")) || 20));

  /*
   * Teste grátis: 30 empresas por dia, contando o que já foi gravado hoje e
   * o que está na fila. O freio mora aqui, no servidor — a tela pode pedir
   * 120; sai o que o teste permite, e a mensagem diz quanto foi.
   */
  const { empresasDisponiveisHoje, TESTE } = await import("@/lib/painel/teste");
  const disponiveis = await empresasDisponiveisHoje(org.id);
  let avisoTeste = "";
  if (disponiveis !== null) {
    if (disponiveis <= 0) {
      return {
        error: `Seu teste grátis permite ${TESTE.empresasPorDia} empresas por dia, e as de hoje já foram. Amanhã libera de novo — ou assine o Prospector para buscar sem esse teto.`,
      };
    }
    if (limite > disponiveis) {
      avisoTeste = ` No teste grátis saem ${disponiveis} agora (o teto é ${TESTE.empresasPorDia} por dia; assinando, não há teto).`;
      limite = disponiveis;
    }
  }
  if (escolhido === "__outro__") {
    if (!nichoLivreValido(livre)) {
      return { error: "Digite o ramo com 3 a 60 letras — ex.: “loja de aquário”." };
    }
  } else if (!acharNicho(nicho)) {
    return { error: "Escolha um nicho da lista." };
  }
  if (local.length < 3) return { error: "Diga a cidade ou o bairro." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("prospeccao_tarefas")
    .select("id", { count: "exact", head: true })
    .eq("org_id", org.id)
    .in("status", ["pendente", "rodando"]);
  if ((count ?? 0) >= 5) {
    return { error: "Já há 5 buscas na fila. Espere elas terminarem." };
  }

  const filtros = normalizarFiltros({
    site: String(formData.get("f_site") ?? ""),
    soWhatsapp: formData.get("f_whatsapp") === "on",
    minAvaliacoes: formData.get("f_min_av"),
    maxAvaliacoes: formData.get("f_max_av"),
    minNota: formData.get("f_min_nota"),
    // "1" = só empresas novas. É o padrão do formulário; a pessoa só troca
    // quando quer, de propósito, trazer as mesmas de novo.
    evitarRepetidas: formData.get("evitar_repetidas") !== "0",
  });
  const comFiltro = temFiltro(filtros) || filtros.evitarRepetidas;

  const base = { org_id: org.id, nicho, local, limite };
  // O tipo gerado do banco ainda não conhece `filtros` (coluna nova), e a
  // inserção é condicional — daí o objeto solto em vez do literal.
  const comColuna: Record<string, unknown> = { ...base, filtros };
  let { error } = await supabase.from("prospeccao_tarefas").insert(comFiltro ? comColuna : base);

  /*
   * A coluna `filtros` é da migração 2026-08-24. Se ela ainda não rodou, a
   * busca entra SEM filtro em vez de falhar: melhor o cliente receber a lista
   * inteira e reclamar do filtro do que não conseguir buscar nada.
   */
  if (error && comFiltro && /filtros/i.test(error.message)) {
    ({ error } = await supabase.from("prospeccao_tarefas").insert(base));
    if (!error) {
      revalidatePath("/app/prospeccao", "layout");
      return {
        ok: "Busca na fila — mas sem os filtros: falta rodar a migração 2026-08-24_filtros_busca.sql no Supabase.",
      };
    }
  }
  if (error) return { error: error.message };

  revalidatePath("/app/prospeccao", "layout");
  return {
    ok:
      (comFiltro
        ? `Busca na fila, filtrando por ${resumoFiltros(filtros).join(" · ")}. O agente abre mais empresas do que o pedido até completar ${limite} que passem.`
        : "Busca na fila. O agente vai executar em instantes — acompanhe aqui embaixo.") + avisoTeste,
  };
}

/*
 * Importar a planilha que o vendedor JÁ tem.
 *
 * A lista dele (exportada de outro CRM, comprada, montada à mão) entra na
 * mesma tabela e usa a mesma máquina de abordagem — sem redigitar nada.
 * Mesmo upsert da busca: importar duas vezes atualiza, não duplica.
 */
export async function importarPlanilha(
  _prev: BuscaState,
  formData: FormData,
): Promise<BuscaState> {
  if (!(await podeUsar("prospeccao"))) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { error: "Escolha o arquivo .csv da sua planilha." };
  }
  if (arquivo.size > 2_000_000) {
    return { error: "Arquivo grande demais (máx. 2 MB). Exporte só as colunas que importam." };
  }

  const lido = lerPlanilha(await arquivo.text());
  if ("erro" in lido) return { error: lido.erro };

  const linhas = lido.linhas.map((l) => ({
    org_id: org.id,
    fonte: "import",
    fonte_id: idDaLinha(l),
    nome: l.nome,
    categoria: l.categoria,
    endereco: l.endereco,
    telefone: l.telefone,
    local_busca: l.local,
    /*
     * Sem site para analisar, a linha entra neutra: situação desconhecida
     * tratada como o padrão do banco e nota no meio da régua. No modo
     * Prospector nada disso aparece; no Agência o dono pode gerar o site
     * do lead e aí a análise real acontece.
     */
    situacao: "sem_nada",
    pontuacao: 50,
    eixos: {},
    motivos: ["Importada da sua planilha"],
  }));

  const supabase = await createClient();
  const { error } = await supabase
    .from("prospeccao")
    .upsert(linhas, { onConflict: "org_id,fonte,fonte_id", ignoreDuplicates: false });
  if (error) return { error: error.message };

  revalidatePath("/app/prospeccao", "layout");
  return {
    ok:
      `${linhas.length} empresas importadas.` +
      (lido.semTelefone > 0
        ? ` ${lido.semTelefone} vieram sem telefone — essas não entram na fila do WhatsApp.`
        : ""),
  };
}

export async function cancelarTarefa(id: string) {
  if (!(await podeUsar("prospeccao"))) return;
  const supabase = await createClient();
  // Só cancela o que ainda não começou: parar no meio deixaria dado pela metade.
  await supabase
    .from("prospeccao_tarefas")
    .update({ status: "cancelada", concluida_em: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pendente");
  revalidatePath("/app/prospeccao", "layout");
}

export async function limparTarefas() {
  if (!(await podeUsar("prospeccao"))) return;
  const supabase = await createClient();
  await supabase
    .from("prospeccao_tarefas")
    .delete()
    .in("status", ["concluida", "erro", "cancelada"]);
  revalidatePath("/app/prospeccao", "layout");
}

// Enfileira a leitura do Instagram desta empresa para o agente fazer.
export async function capturarInstagram(id: string) {
  if (!(await podeUsar("prospeccao"))) return;
  // A captura existe para abastecer o SITE (bio e fotos no briefing). Plano
  // sem construtor não tem site para abastecer — botão some e a trava é esta.
  if (!(await podeUsar("construtor"))) return;
  const org = await getMinhaOrg();
  if (!org) return;
  const supabase = await createClient();

  /*
   * Trava de ritmo. Na primeira vez foram dez capturas em dois minutos e o
   * Instagram cortou o acesso em todas — o botão não pode deixar isso
   * acontecer de novo. O painel esconde o botão quando o limite chega, e esta
   * checagem é a garantia de verdade (o formulário pode ser reenviado).
   */
  const { count: naFila } = await supabase
    .from("prospeccao_tarefas")
    .select("id", { count: "exact", head: true })
    .eq("org_id", org.id)
    .eq("tipo", "instagram")
    .in("status", ["pendente", "rodando"]);
  if ((naFila ?? 0) >= IG_FILA_MAX) return;

  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);
  const { count: hoje } = await supabase
    .from("prospeccao_tarefas")
    .select("id", { count: "exact", head: true })
    .eq("org_id", org.id)
    .eq("tipo", "instagram")
    .gte("created_at", inicioDia.toISOString());
  if ((hoje ?? 0) >= IG_LIMITE_DIA) return;

  await supabase.from("prospeccao_tarefas").insert({
    org_id: org.id,
    tipo: "instagram",
    prospecto_id: id,
    nicho: null,
    local: null,
    limite: 1,
  });
  revalidatePath("/app/prospeccao", "layout");
}

/*
 * Pede ao agente o print do site ATUAL desta empresa — a metade "hoje" da
 * comparação. De quebra garante o código do link único (/p e /espelho
 * penduram nele).
 */
export async function pedirEspelho(id: string) {
  if (!(await podeUsar("prospeccao"))) return;
  // O espelho compara o site atual com o NOSSO — sem construtor não há "nosso".
  if (!(await podeUsar("construtor"))) return;
  if (!(await funcaoLigada("espelho"))) return;
  const org = await getMinhaOrg();
  if (!org) return;
  const supabase = await createClient();

  const { data } = await supabase
    .from("prospeccao")
    .select("id, website, link_codigo")
    .eq("id", id)
    .eq("org_id", org.id)
    .maybeSingle();
  const p = data as { id: string; website: string | null; link_codigo: string | null } | null;
  if (!p?.website) return;

  if (!p.link_codigo) {
    await supabase
      .from("prospeccao")
      .update({ link_codigo: codigoSeguro() })
      .eq("id", id);
  }

  // Fila com teto e sem duplicata: reenvio do formulário não vira print duplo.
  const { count } = await supabase
    .from("prospeccao_tarefas")
    .select("id", { count: "exact", head: true })
    .eq("org_id", org.id)
    .eq("tipo", "espelho")
    .in("status", ["pendente", "rodando"]);
  if ((count ?? 0) >= 10) return;
  const { count: jaPedido } = await supabase
    .from("prospeccao_tarefas")
    .select("id", { count: "exact", head: true })
    .eq("org_id", org.id)
    .eq("tipo", "espelho")
    .eq("prospecto_id", id)
    .in("status", ["pendente", "rodando"]);
  if ((jaPedido ?? 0) > 0) return;

  await supabase.from("prospeccao_tarefas").insert({
    org_id: org.id,
    tipo: "espelho",
    prospecto_id: id,
    nicho: null,
    local: null,
    limite: 1,
  });
  revalidatePath("/app/prospeccao", "layout");
}

/*
 * Etiqueta: a opinião de quem vende sobre o lead ("quente", "ligar sexta").
 * Não confundir com o status, que é o funil e anda sozinho. Texto curto e
 * livre; null limpa.
 */
export async function mudarEtiqueta(id: string, etiqueta: string | null) {
  if (!(await podeUsar("prospeccao"))) return;
  const limpa = (etiqueta ?? "").trim().slice(0, 30);
  const supabase = await createClient();
  await supabase
    .from("prospeccao")
    .update({ etiqueta: limpa || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/app/prospeccao", "layout");
}

// A versão para <form>: o texto vem do campo, o id vem no bind.
export async function etiquetarDoForm(id: string, formData: FormData) {
  await mudarEtiqueta(id, String(formData.get("etiqueta") ?? ""));
}

/*
 * "Me lembra dia X". O follow-up MANUAL que todo vendedor combina no
 * WhatsApp ("te chamo sexta") e esquece — aqui vira selo ⏰ e o lead sobe
 * para o topo no dia. dias=null limpa; data por extenso vem do formulário.
 */
export async function marcarLembrete(id: string, dias: number | null) {
  if (!(await podeUsar("prospeccao"))) return;
  // O "hoje" de quem usa é o de Brasília (UTC-3), não o do servidor em UTC.
  const valor =
    dias === null
      ? null
      : new Date(Date.now() - 3 * 3_600_000 + dias * 86_400_000).toISOString().slice(0, 10);
  const supabase = await createClient();
  await supabase
    .from("prospeccao")
    .update({ lembrete_em: valor, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/app/prospeccao", "layout");
}

export async function lembreteDoForm(id: string, formData: FormData) {
  const data = String(formData.get("data") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return;
  if (!(await podeUsar("prospeccao"))) return;
  const supabase = await createClient();
  await supabase
    .from("prospeccao")
    .update({ lembrete_em: data, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/app/prospeccao", "layout");
}

export async function mudarStatus(id: string, status: StatusProspecto) {
  if (!(await podeUsar("prospeccao"))) return;
  const supabase = await createClient();
  await supabase
    .from("prospeccao")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/app/prospeccao", "layout");
  // O Funil (Kanban) mostra os mesmos leads — sem isto o card voltaria de
  // coluna no próximo carregamento, desfazendo o arrasto na cara do dono.
}

export async function excluirProspecto(id: string) {
  if (!(await podeUsar("prospeccao"))) return;
  const supabase = await createClient();
  await supabase.from("prospeccao").delete().eq("id", id);
  revalidatePath("/app/prospeccao", "layout");
}

// Cria a página de IA já apontada para esta empresa e leva você ao construtor
// com o pedido pronto no chat.
export async function gerarSiteParaProspecto(id: string) {
  if (!(await podeUsar("prospeccao"))) return;
  /*
   * O botão some no plano só de prospecção, mas esconder botão não é trava:
   * a action continua chamável. Sem esta linha, o Prospector criaria uma
   * linha órfã em sites_ia e cairia num 404 — o construtor, esse, já é
   * fechado em todas as telas de /app/ia.
   */
  if (!(await podeUsar("construtor"))) return;
  const org = await getMinhaOrg();
  if (!org) return;

  const supabase = await createClient();
  const { data } = await supabase.from("prospeccao").select("*").eq("id", id).maybeSingle();
  const p = data as ProspectoRow | null;
  if (!p) return;

  const { data: nova } = await supabase
    .from("sites_ia")
    .insert({
      org_id: org.id,
      titulo: p.nome,
      slug: `${slugify(p.nome) || "site"}-${Math.random().toString(36).slice(2, 6)}`,
      // Vínculo de volta: abrindo o site você sabe de qual empresa ele é.
      prospecto_id: p.id,
    })
    .select("id")
    .single();
  const siteId = (nova as { id: string } | null)?.id;
  if (!siteId) return;

  await supabase.from("prospeccao").update({ site_ia_id: siteId }).eq("id", id);

  // O briefing (com dados reais e fotos do Instagram) e o mesmo do Fechador —
  // um texto so, em lib/prospeccao/briefing.ts, para os dois nunca divergirem.
  const pedido = montarBriefingDoProspecto(p);

  redirect(`/app/ia/${siteId}?pedido=${encodeURIComponent(pedido)}`);
}
