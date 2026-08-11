/*
 * Executa uma tarefa de captura de Instagram: lê o perfil, baixa as fotos
 * para o Storage e grava tudo no registro da empresa.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { capturarInstagram, baixarFoto } from "./instagram.ts";
import { usuarioInstagramDe } from "../lib/prospeccao/instagram.ts";

const agora = () => new Date().toISOString();

type Prospecto = {
  id: string;
  org_id: string;
  nome: string;
  instagram: string | null;
  website: string | null;
};

export async function capturarInstagramDoProspecto(
  supabase: SupabaseClient,
  prospectoId: string,
  headless: boolean,
  log: (m: string) => void,
): Promise<{ ok: boolean; resumo: string }> {
  const { data } = await supabase
    .from("prospeccao")
    .select("id, org_id, nome, instagram, website")
    .eq("id", prospectoId)
    .maybeSingle();
  const p = data as Prospecto | null;
  if (!p) return { ok: false, resumo: "Empresa não encontrada." };

  const usuario = usuarioInstagramDe(p);
  if (!usuario) {
    await supabase
      .from("prospeccao")
      .update({
        ig_status: "nao_encontrado",
        ig_erro: "Esta empresa não tem Instagram cadastrado.",
        ig_capturado_em: agora(),
      })
      .eq("id", p.id);
    return { ok: false, resumo: "sem Instagram cadastrado" };
  }

  log(`abrindo instagram.com/${usuario}`);
  const r = await capturarInstagram(usuario, headless, log);

  if (r.status !== "ok" || !r.dados) {
    await supabase
      .from("prospeccao")
      .update({ ig_status: r.status, ig_erro: r.erro ?? null, ig_capturado_em: agora() })
      .eq("id", p.id);
    return { ok: false, resumo: r.erro ?? r.status };
  }

  // Baixa as fotos agora: os links do Instagram expiram em poucas horas.
  const fotos: { url: string; legenda?: string }[] = [];
  for (const [i, foto] of r.dados.fotos.entries()) {
    const buf = await baixarFoto(foto.url);
    if (!buf) continue;

    const caminho = `${p.org_id}/instagram/${p.id}/${i}-${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from("midias")
      .upload(caminho, buf, { contentType: "image/jpeg", upsert: true });
    if (error) continue;

    const { data: pub } = supabase.storage.from("midias").getPublicUrl(caminho);
    fotos.push({ url: pub.publicUrl, legenda: foto.legenda });
  }

  await supabase
    .from("prospeccao")
    .update({
      ig_nome: r.dados.nome ?? null,
      ig_bio: r.dados.bio ?? null,
      ig_seguidores: r.dados.seguidores ?? null,
      ig_posts: r.dados.posts ?? null,
      ig_fotos: fotos,
      ig_status: "ok",
      ig_erro: fotos.length === 0 ? "Perfil lido, mas nenhuma foto pôde ser baixada." : null,
      ig_capturado_em: agora(),
    })
    .eq("id", p.id);

  log(`${fotos.length} fotos salvas de @${usuario}`);
  return { ok: true, resumo: `${fotos.length} fotos · ${r.dados.seguidores ?? "?"} seguidores` };
}
