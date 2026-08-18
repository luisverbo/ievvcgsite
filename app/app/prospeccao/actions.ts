"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { slugify } from "@/lib/format";
import { podeUsar } from "@/lib/painel/permissoes";
import { buscarEmpresas, localizar } from "@/lib/prospeccao/overpass";
import { analisarSite } from "@/lib/prospeccao/site";
import { calcularPotencial, ehEnderecoSocial } from "@/lib/prospeccao/score";
import { acharNicho } from "@/lib/prospeccao/nichos";
import { IG_FILA_MAX, IG_LIMITE_DIA } from "@/lib/prospeccao/instagram";
import { montarBriefingDoProspecto } from "@/lib/prospeccao/briefing";
import { funcaoLigada } from "@/lib/painel/flags";
import { codigoSeguro } from "@/lib/codigo";
import type { ProspectoRow, StatusProspecto } from "@/lib/prospeccao/tipos";

export type BuscaState = { ok?: string; error?: string } | undefined;

export async function buscarProspectos(
  _prev: BuscaState,
  formData: FormData,
): Promise<BuscaState> {
  if (!(await podeUsar("prospeccao"))) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };

  const nicho = String(formData.get("nicho") ?? "").trim();
  const local = String(formData.get("local") ?? "").trim();
  const limite = Math.min(60, Math.max(5, Number(formData.get("limite")) || 20));
  if (!acharNicho(nicho)) return { error: "Escolha um nicho da lista." };
  if (local.length < 3) return { error: "Diga a cidade ou o bairro." };

  let empresas;
  try {
    const caixa = await localizar(local);
    if (!caixa) return { error: `Não encontrei "${local}". Tente "Bairro, Cidade".` };
    empresas = await buscarEmpresas(nicho, caixa, limite);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "A busca falhou." };
  }

  if (empresas.length === 0) {
    return {
      error:
        "Nenhuma empresa encontrada. Tente uma área maior (a cidade inteira) ou outro nicho — o OpenStreetMap tem menos cadastros que o Google.",
    };
  }

  // Analisa em paralelo só os sites que existem e não são rede social.
  const analises = await Promise.all(
    empresas.map((e) =>
      e.website && !ehEnderecoSocial(e.website) ? analisarSite(e.website).catch(() => null) : null,
    ),
  );

  const linhas = empresas.map((e, i) => {
    const p = calcularPotencial(e, nicho, analises[i]);
    return {
      org_id: org.id,
      fonte: "osm",
      fonte_id: e.fonte_id,
      nome: e.nome,
      categoria: e.categoria ?? null,
      endereco: e.endereco ?? null,
      telefone: e.telefone ?? null,
      website: e.website ?? null,
      instagram: e.instagram ?? null,
      facebook: e.facebook ?? null,
      lat: e.lat ?? null,
      lon: e.lon ?? null,
      nicho_busca: nicho,
      local_busca: local,
      situacao: p.situacao,
      pontuacao: p.pontuacao,
      eixos: p.eixos,
      motivos: p.motivos,
    };
  });

  // onConflict mantém o que já existe (inclusive o status do funil) e só
  // atualiza os dados da empresa — refazer a busca não apaga seu trabalho.
  const supabase = await createClient();
  const { error } = await supabase
    .from("prospeccao")
    .upsert(linhas, { onConflict: "org_id,fonte,fonte_id", ignoreDuplicates: false });
  if (error) return { error: error.message };

  const semSite = linhas.filter((l) => l.situacao !== "site_moderno").length;
  revalidatePath("/app/prospeccao");
  return {
    ok: `${linhas.length} empresas encontradas · ${semSite} com potencial real de venda.`,
  };
}

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

  const nicho = String(formData.get("nicho") ?? "").trim();
  const local = String(formData.get("local") ?? "").trim();
  const limite = Math.min(60, Math.max(5, Number(formData.get("limite")) || 20));
  if (!acharNicho(nicho)) return { error: "Escolha um nicho da lista." };
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

  const { error } = await supabase
    .from("prospeccao_tarefas")
    .insert({ org_id: org.id, nicho, local, limite });
  if (error) return { error: error.message };

  revalidatePath("/app/prospeccao");
  return {
    ok: "Busca na fila. O agente vai executar em instantes — acompanhe aqui embaixo.",
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
  revalidatePath("/app/prospeccao");
}

export async function limparTarefas() {
  if (!(await podeUsar("prospeccao"))) return;
  const supabase = await createClient();
  await supabase
    .from("prospeccao_tarefas")
    .delete()
    .in("status", ["concluida", "erro", "cancelada"]);
  revalidatePath("/app/prospeccao");
}

// Enfileira a leitura do Instagram desta empresa para o agente fazer.
export async function capturarInstagram(id: string) {
  if (!(await podeUsar("prospeccao"))) return;
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
  revalidatePath("/app/prospeccao");
}

/*
 * Pede ao agente o print do site ATUAL desta empresa — a metade "hoje" da
 * comparação. De quebra garante o código do link único (/p e /espelho
 * penduram nele).
 */
export async function pedirEspelho(id: string) {
  if (!(await podeUsar("prospeccao"))) return;
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
  revalidatePath("/app/prospeccao");
}

export async function mudarStatus(id: string, status: StatusProspecto) {
  if (!(await podeUsar("prospeccao"))) return;
  const supabase = await createClient();
  await supabase
    .from("prospeccao")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/app/prospeccao");
}

export async function excluirProspecto(id: string) {
  if (!(await podeUsar("prospeccao"))) return;
  const supabase = await createClient();
  await supabase.from("prospeccao").delete().eq("id", id);
  revalidatePath("/app/prospeccao");
}

// Cria a página de IA já apontada para esta empresa e leva você ao construtor
// com o pedido pronto no chat.
export async function gerarSiteParaProspecto(id: string) {
  if (!(await podeUsar("prospeccao"))) return;
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
