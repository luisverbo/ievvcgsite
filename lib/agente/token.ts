import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Token do agente.
 *
 * O agente do cliente roda na máquina dele e precisa provar de quem é a fila
 * que está pedindo. O token faz isso — e é a razão de o agente nunca mais
 * receber a service_role, que abriria o banco de todos os clientes.
 *
 * Guardamos só o hash: um vazamento do banco não permite se passar por
 * ninguém, e nem nós conseguimos ler o token de um cliente.
 */

const PREFIXO = "pp_";

export function gerarToken(): string {
  return PREFIXO + randomBytes(24).toString("base64url");
}

export function hashDoToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export type AgenteAutenticado = { id: string; orgId: string; nome: string };

/*
 * Descobre de quem é o token que chegou na requisição.
 *
 * A busca é pelo hash, num índice único: comparar em tempo constante não é
 * necessário aqui porque o banco procura o valor já digerido, e não existe
 * comparação byte a byte com um segredo nosso.
 */
export async function agenteDaRequisicao(req: Request): Promise<AgenteAutenticado | null> {
  const cabecalho = req.headers.get("authorization") ?? "";
  const token = cabecalho.replace(/^Bearer\s+/i, "").trim();
  if (!token || !token.startsWith(PREFIXO)) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("agentes")
    .select("id, org_id, nome, ativo")
    .eq("token_hash", hashDoToken(token))
    .maybeSingle();

  const linha = data as { id: string; org_id: string; nome: string; ativo: boolean } | null;
  if (!linha || !linha.ativo) return null;

  /*
   * Marca presença. É isso que faz o painel mostrar "agente ligado" sem o
   * agente precisar de porta aberta.
   *
   * O await não é opcional: as consultas do Supabase só saem quando alguém
   * espera por elas. Sem isto a linha nunca era gravada, o agente trabalhava
   * normalmente e o painel jurava que ninguém estava conectado.
   */
  await admin
    .from("agentes")
    .update({ ultimo_contato: new Date().toISOString() })
    .eq("id", linha.id);

  return { id: linha.id, orgId: linha.org_id, nome: linha.nome };
}

// Comparação em tempo constante, para quando houver um segredo nosso a checar.
export function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
