/*
 * Executa uma tarefa de captura de Instagram: lê o perfil, baixa as fotos e
 * manda tudo para o painel.
 *
 * As fotos vão em base64 na mesma requisição, e não como link: as URLs do
 * Instagram são assinadas e expiram em poucas horas — guardar o endereço não
 * serviria de nada. Quem grava no Storage é o servidor; o agente do cliente
 * não tem (nem deve ter) acesso de escrita ao bucket.
 */

import * as api from "./api.ts";
import { capturarInstagram, baixarFoto } from "./instagram.ts";
import { usuarioInstagramDe, type StatusIG } from "../lib/prospeccao/instagram.ts";

export type ResultadoCaptura = { ok: boolean; resumo: string; status?: StatusIG };

export async function capturarInstagramDoProspecto(
  prospectoId: string,
  headless: boolean,
  log: (m: string) => void,
): Promise<ResultadoCaptura> {
  const p = await api.prospectoIg(prospectoId);
  if (!p) return { ok: false, resumo: "Empresa não encontrada.", status: "erro" };

  const usuario = usuarioInstagramDe(p);
  if (!usuario) {
    await api.gravarInstagram({
      id: p.id,
      status: "nao_encontrado",
      erro: "Esta empresa não tem Instagram cadastrado.",
    });
    return { ok: false, resumo: "sem Instagram cadastrado", status: "nao_encontrado" };
  }

  log(`abrindo instagram.com/${usuario}`);
  const r = await capturarInstagram(usuario, headless, log);

  if (r.status !== "ok" || !r.dados) {
    await api.gravarInstagram({ id: p.id, status: r.status, erro: r.erro ?? null });
    return { ok: false, resumo: r.erro ?? r.status, status: r.status };
  }

  // Baixa as fotos agora: os links do Instagram expiram em poucas horas.
  const fotos: { base64: string; legenda?: string }[] = [];
  for (const foto of r.dados.fotos) {
    const buf = await baixarFoto(foto.url);
    if (!buf) continue;
    fotos.push({ base64: buf.toString("base64"), legenda: foto.legenda });
  }

  const gravou = await api.gravarInstagram({
    id: p.id,
    status: "ok",
    dados: {
      nome: r.dados.nome,
      bio: r.dados.bio,
      seguidores: r.dados.seguidores,
      posts: r.dados.posts,
    },
    fotos,
  });

  log(`${gravou.fotos} fotos salvas de @${usuario}`);
  return {
    ok: true,
    resumo: `${gravou.fotos} fotos · ${r.dados.seguidores ?? "?"} seguidores`,
    status: "ok",
  };
}
