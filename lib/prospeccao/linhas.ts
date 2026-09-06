import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { inicioDoDiaBr } from "./dia";

/*
 * As LINHAS de WhatsApp de uma conta — e quem manda a próxima mensagem.
 *
 * Cada número conectado é uma linha, com QR, estado e limite diário
 * próprios. O agente (ou vários) segura as sessões; quem decide qual linha
 * envia é o servidor, aqui, com uma regra só:
 *
 *   "quantas linhas enviam ao mesmo tempo" (linhas_simultaneas)
 *
 *   - as linhas VIVAS (conectadas, ligadas, com o agente dando sinal) e
 *     ainda dentro do limite do dia, em ordem de preferência;
 *   - as N primeiras estão EM USO; as outras são reserva;
 *   - entre as em uso, a vez é de quem mandou há mais tempo (revezamento);
 *   - a conta inteira respeita uma cadência só (proximo_envio_em): com
 *     intervalo de 10 min e duas linhas, sai uma a cada 10 min, alternando.
 *
 * Caiu uma linha em uso? Ela some das vivas, a próxima da fila entra — sem
 * ninguém apertar nada. Com N = 1 é o "manda por um; quando cair, vai para o
 * segundo"; com N = todas é o revezamento pleno.
 *
 * Tudo tolerante à migração: sem a tabela, as funções devolvem null e a rota
 * segue no comportamento antigo (um WhatsApp por conta).
 */

export type EstadoLinha = "desconectado" | "aguardando_qr" | "conectado" | "erro";

export type LinhaRow = {
  id: string;
  org_id: string;
  nome: string;
  ordem: number;
  agente_id: string | null;
  principal: boolean;
  status: EstadoLinha;
  qr: string | null;
  mensagem: string | null;
  atualizado_em: string | null;
  desconectar_pedido: boolean;
  ultima_enviada_em: string | null;
  ativa: boolean;
  created_at: string;
};

export const MAX_LINHAS = 5;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Colunas sem o QR (que pode ter 1MB e não interessa ao agente).
const COLS = "id, org_id, nome, ordem, agente_id, principal, status, mensagem, atualizado_em, desconectar_pedido, ultima_enviada_em, ativa, created_at";

/*
 * As linhas da organização, em ordem de preferência. null = migração não
 * rodou (tabela ausente): quem chama volta ao comportamento antigo.
 */
export async function linhasDaOrg(orgId: string, comQr = false): Promise<LinhaRow[] | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("whatsapp_linhas")
      .select(comQr ? `${COLS}, qr` : COLS)
      .eq("org_id", orgId)
      .order("ordem")
      .order("created_at");
    if (error) return null;
    return ((data as unknown as Partial<LinhaRow>[] | null) ?? []).map((l) => ({
      qr: null,
      ...l,
    })) as LinhaRow[];
  } catch {
    return null;
  }
}

/*
 * A linha principal — a do perfil antigo do agente. Conta criada depois da
 * migração não tem nenhuma: nasce aqui, na primeira vez que alguém precisa
 * dela (o agente antigo reportando estado, o painel clicando em Conectar).
 */
export async function garantirPrincipal(orgId: string): Promise<LinhaRow | null> {
  const linhas = await linhasDaOrg(orgId);
  if (linhas === null) return null;
  const atual = linhas.find((l) => l.principal);
  if (atual) return atual;

  try {
    const admin = createAdminClient();
    const { data: cfg } = await admin
      .from("prospeccao_config")
      .select("whatsapp_status, whatsapp_mensagem")
      .eq("org_id", orgId)
      .maybeSingle();
    const c = cfg as { whatsapp_status: string | null; whatsapp_mensagem: string | null } | null;
    const { data, error } = await admin
      .from("whatsapp_linhas")
      .insert({
        org_id: orgId,
        nome: "Linha 1",
        ordem: 1,
        principal: true,
        status: c?.whatsapp_status ?? "desconectado",
        mensagem: c?.whatsapp_mensagem ?? null,
      })
      .select(COLS)
      .single();
    if (error) {
      // Corrida: outro pedido criou antes. Lê de novo.
      const de_novo = await linhasDaOrg(orgId);
      return de_novo?.find((l) => l.principal) ?? null;
    }
    return { qr: null, ...(data as unknown as Omit<LinhaRow, "qr">) };
  } catch {
    return null;
  }
}

/*
 * A linha de um pedido do agente: a que ele nomeou (e que seja desta
 * organização) — ou a principal, para agente antigo que não sabe de linha.
 */
export async function resolverLinha(orgId: string, linhaId: unknown): Promise<LinhaRow | null> {
  const id = typeof linhaId === "string" && UUID.test(linhaId) ? linhaId : null;
  if (!id) return garantirPrincipal(orgId);
  const linhas = await linhasDaOrg(orgId);
  if (linhas === null) return null;
  return linhas.find((l) => l.id === id) ?? null;
}

type PatchLinha = Partial<
  Pick<LinhaRow, "status" | "mensagem" | "qr" | "desconectar_pedido" | "agente_id" | "ultima_enviada_em">
>;

/*
 * Atualiza a linha — e, se for a principal, ESPELHA nas colunas antigas de
 * prospeccao_config. É o espelho que mantém agente e telas antigas vivos
 * enquanto a migração das máquinas acontece.
 */
export async function atualizarLinha(orgId: string, linha: LinhaRow, patch: PatchLinha): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin
      .from("whatsapp_linhas")
      .update({ ...patch, atualizado_em: new Date().toISOString() })
      .eq("id", linha.id)
      .eq("org_id", orgId);

    if (linha.principal) {
      const espelho: Record<string, unknown> = { org_id: orgId, whatsapp_em: new Date().toISOString() };
      if (patch.status !== undefined) espelho.whatsapp_status = patch.status;
      if (patch.mensagem !== undefined) espelho.whatsapp_mensagem = patch.mensagem;
      if (patch.qr !== undefined) espelho.whatsapp_qr = patch.qr;
      if (patch.desconectar_pedido !== undefined) espelho.desconectar_pedido = patch.desconectar_pedido;
      await admin.from("prospeccao_config").upsert(espelho, { onConflict: "org_id" });
    }
  } catch (e) {
    console.error("[linhas] atualizar:", (e as Error).message);
  }
}

/* ------------------------------ o escalonador ------------------------------ */

export type CadenciaEnvio = {
  intervalo_min_s: number;
  intervalo_max_s: number;
  linhas_simultaneas: number;
  proximo_envio_em: string | null;
};

// Agente vivo = deu sinal nos últimos 15 min (o mesmo critério das telas).
const VIVO_MS = 15 * 60_000;

/*
 * Esta linha pode mandar a próxima mensagem AGORA?
 *
 * `continuacao` (a apresentação de quem respondeu ao gancho) só exige que a
 * linha esteja viva: não conta no limite nem espera a vez — o lead está com o
 * WhatsApp na mão.
 */
export async function podeEnviarPor(
  orgId: string,
  linha: LinhaRow,
  cadencia: CadenciaEnvio,
  limitePorLinha: number,
  continuacao: boolean,
): Promise<{ pode: boolean; motivo: string }> {
  const admin = createAdminClient();
  const linhas = (await linhasDaOrg(orgId)) ?? [linha];

  // Quem está vivo: o agente de cada linha, pelo último sinal.
  const ids = [...new Set(linhas.map((l) => l.agente_id).filter(Boolean))] as string[];
  const vivos = new Set<string>();
  if (ids.length > 0) {
    const { data } = await admin.from("agentes").select("id, ultimo_contato").in("id", ids);
    for (const a of (data as { id: string; ultimo_contato: string | null }[] | null) ?? []) {
      if (a.ultimo_contato && Date.now() - new Date(a.ultimo_contato).getTime() < VIVO_MS) vivos.add(a.id);
    }
  }
  const viva = (l: LinhaRow) =>
    l.ativa && l.status === "conectado" && (l.agente_id === null || vivos.has(l.agente_id));

  if (!viva(linha)) return { pode: false, motivo: "linha fora do ar ou desligada" };
  if (continuacao) return { pode: true, motivo: "" };

  // Enviadas hoje, por linha (a principal também herda as sem linha, de antes).
  const { data: hoje } = await admin
    .from("prospeccao_mensagens")
    .select("linha_id")
    .eq("org_id", orgId)
    .eq("status", "enviada")
    .neq("tipo", "apresentacao")
    .gte("enviada_em", inicioDoDiaBr());
  const contagem = new Map<string, number>();
  const principal = linhas.find((l) => l.principal)?.id ?? null;
  for (const m of (hoje as { linha_id: string | null }[] | null) ?? []) {
    const chave = m.linha_id ?? principal;
    if (chave) contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  const enviadas = (l: LinhaRow) => contagem.get(l.id) ?? 0;

  // As elegíveis, em ordem de preferência; as N primeiras estão em uso.
  const elegiveis = linhas.filter((l) => viva(l) && enviadas(l) < limitePorLinha);
  const n = Math.max(1, Math.min(MAX_LINHAS, cadencia.linhas_simultaneas || 1));
  const emUso = elegiveis.slice(0, n);
  if (!emUso.some((l) => l.id === linha.id)) {
    return {
      pode: false,
      motivo: enviadas(linha) >= limitePorLinha ? "limite do dia desta linha" : "linha de reserva",
    };
  }

  // A cadência da conta: uma mensagem por vez, no intervalo escolhido.
  if (cadencia.proximo_envio_em && Date.now() < new Date(cadencia.proximo_envio_em).getTime()) {
    return { pode: false, motivo: "dentro do intervalo" };
  }

  // O revezamento: a vez é de quem mandou há mais tempo.
  const vez = [...emUso].sort((a, b) => {
    const ta = a.ultima_enviada_em ? new Date(a.ultima_enviada_em).getTime() : 0;
    const tb = b.ultima_enviada_em ? new Date(b.ultima_enviada_em).getTime() : 0;
    return ta - tb || a.ordem - b.ordem;
  })[0];
  if (vez.id !== linha.id) return { pode: false, motivo: `vez da ${vez.nome}` };

  return { pode: true, motivo: "" };
}

/*
 * Uma mensagem foi entregue a esta linha: marca a vez dela e arma a cadência
 * da conta (intervalo aleatório — cadência regular é o que denuncia robô).
 */
export async function registrarEntrega(orgId: string, linha: LinhaRow, cadencia: CadenciaEnvio): Promise<void> {
  try {
    const admin = createAdminClient();
    const min = Math.max(20, cadencia.intervalo_min_s || 45);
    const max = Math.max(min + 5, cadencia.intervalo_max_s || 150);
    const s = min + Math.random() * (max - min);
    const agora = new Date().toISOString();
    await Promise.all([
      admin.from("whatsapp_linhas").update({ ultima_enviada_em: agora }).eq("id", linha.id),
      admin
        .from("prospeccao_config")
        .update({ proximo_envio_em: new Date(Date.now() + s * 1000).toISOString() })
        .eq("org_id", orgId),
    ]);
  } catch {
    /* cadência é bônus; o envio já saiu */
  }
}

// O envio falhou por queda da sessão: libera a cadência para outra linha assumir já.
export async function liberarCadencia(orgId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("prospeccao_config").update({ proximo_envio_em: null }).eq("org_id", orgId);
  } catch {
    /* idem */
  }
}
