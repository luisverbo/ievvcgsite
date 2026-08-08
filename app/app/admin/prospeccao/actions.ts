"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { slugify } from "@/lib/format";
import { ehAdmin } from "../actions";
import { buscarEmpresas, localizar } from "@/lib/prospeccao/overpass";
import { analisarSite } from "@/lib/prospeccao/site";
import { calcularPotencial, ehEnderecoSocial } from "@/lib/prospeccao/score";
import { acharNicho } from "@/lib/prospeccao/nichos";
import { briefingDoNicho } from "@/lib/prospeccao/briefings";
import type { ProspectoRow, StatusProspecto } from "@/lib/prospeccao/tipos";

export type BuscaState = { ok?: string; error?: string } | undefined;

export async function buscarProspectos(
  _prev: BuscaState,
  formData: FormData,
): Promise<BuscaState> {
  if (!(await ehAdmin())) return { error: "Sem permissão." };
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
  revalidatePath("/app/admin/prospeccao");
  return {
    ok: `${linhas.length} empresas encontradas · ${semSite} com potencial real de venda.`,
  };
}

export async function mudarStatus(id: string, status: StatusProspecto) {
  if (!(await ehAdmin())) return;
  const supabase = await createClient();
  await supabase
    .from("prospeccao")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/app/admin/prospeccao");
}

export async function excluirProspecto(id: string) {
  if (!(await ehAdmin())) return;
  const supabase = await createClient();
  await supabase.from("prospeccao").delete().eq("id", id);
  revalidatePath("/app/admin/prospeccao");
}

// Cria a página de IA já apontada para esta empresa e leva você ao construtor
// com o pedido pronto no chat.
export async function gerarSiteParaProspecto(id: string) {
  if (!(await ehAdmin())) return;
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

  const ramo = acharNicho(p.nicho_busca ?? "")?.rotulo ?? p.categoria ?? "negócio local";
  const dados = [
    p.endereco ? `Endereço: ${p.endereco}` : "",
    p.telefone ? `Telefone/WhatsApp: ${p.telefone}` : "",
    p.instagram ? `Instagram: ${p.instagram}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  // O briefing do nicho é o que faz o site sair com cara de dentista, e não
  // com cara de página genérica bonita.
  const pedido = `Crie uma landing page de alta conversão para "${p.nome}", ${ramo.toLowerCase()}${
    p.local_busca ? ` em ${p.local_busca}` : ""
  }.

DADOS REAIS DA EMPRESA (use estes, não invente):
${dados || "(sem dados de contato — deixe os campos marcados para eu preencher)"}

${briefingDoNicho(p.nicho_busca)}

OBJETIVO: fazer o visitante chamar no WhatsApp. Todo botão principal deve levar ao WhatsApp do número acima (link https://wa.me/55DDDNUMERO com uma mensagem pronta).
Se faltar alguma informação (preços, nome da equipe, depoimentos), escreva um exemplo plausível e me avise no final o que devo trocar.`;

  redirect(`/app/admin/ia/${siteId}?pedido=${encodeURIComponent(pedido)}`);
}
