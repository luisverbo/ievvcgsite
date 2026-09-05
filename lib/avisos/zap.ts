import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmail, emailConfigurado } from "@/lib/email/enviar";

/*
 * Avisos do dono no WhatsApp.
 *
 * "Alguém entrou no teste grátis", "alguém acabou de assinar": o tipo de
 * notícia que o dono quer no bolso, na hora — não numa tela de admin que ele
 * abre de vez em quando.
 *
 * Como chega sem API paga: o agente da organização do dono (a VPS) já sabe
 * mandar mensagem para o número dele — é o caminho do resumo diário. Aqui
 * só existe uma FILA: o servidor enfileira, e a rota do agente entrega o
 * aviso como se fosse um resumo. Nada muda no programa que roda na máquina.
 *
 * O e-mail do dono (ADMIN_EMAIL) recebe uma cópia quando o Resend está
 * configurado: é o plano B para o dia em que o agente estiver desligado.
 *
 * Nunca lança: aviso é cortesia. Falhar aqui não pode derrubar uma compra
 * nem uma ativação de teste.
 */

export const CHAVES_AVISO = {
  numero: "aviso_zap_numero",
  org: "aviso_zap_org",
} as const;

export type ConfigAvisos = { telefone: string; orgId: string } | null;

export async function configAvisos(): Promise<ConfigAvisos> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("config_sistema")
      .select("chave, valor")
      .in("chave", [CHAVES_AVISO.numero, CHAVES_AVISO.org]);
    const mapa = new Map(
      ((data as { chave: string; valor: string | null }[] | null) ?? []).map((l) => [l.chave, l.valor]),
    );
    const telefone = (mapa.get(CHAVES_AVISO.numero) ?? "").replace(/\D/g, "");
    const orgId = (mapa.get(CHAVES_AVISO.org) ?? "").trim();
    if (!telefone || !orgId) return null;
    return { telefone, orgId };
  } catch {
    return null;
  }
}

/*
 * Enfileira um aviso para o dono (e manda a cópia por e-mail).
 *
 * `titulo` é a primeira linha (vira assunto do e-mail); `linhas`, o resto.
 */
export async function avisarDono(titulo: string, linhas: string[] = []): Promise<void> {
  const texto = [titulo, "", ...linhas].join("\n").trim();

  try {
    const cfg = await configAvisos();
    if (cfg) {
      const admin = createAdminClient();
      const { error } = await admin.from("avisos_zap").insert({
        org_id: cfg.orgId,
        telefone: cfg.telefone,
        texto,
      });
      if (error) console.error("[avisos] não enfileirou:", error.message);
    }
  } catch (e) {
    console.error("[avisos]", (e as Error).message);
  }

  try {
    const email = process.env.ADMIN_EMAIL?.trim();
    if (email && emailConfigurado()) {
      await enviarEmail({
        para: email,
        assunto: titulo.replace(/^[^\p{L}\p{N}]+/u, "").trim() || "Aviso do painel",
        html: `<pre style="font:15px/1.5 -apple-system,Segoe UI,sans-serif;white-space:pre-wrap">${escapar(texto)}</pre>`,
        texto,
      });
    }
  } catch {
    /* e-mail é o plano B do plano B */
  }
}

function escapar(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);
}

/* ------------------- o lado do agente: a entrega da fila ------------------- */

// Há aviso esperando este agente? (Faz o agente abrir o WhatsApp para enviar.)
export async function avisoPendente(orgId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("avisos_zap")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "pendente");
    return !error && (count ?? 0) > 0;
  } catch {
    return false;
  }
}

/*
 * Entrega o próximo aviso e já o marca como enviado: é a reserva, para
 * dois agentes da mesma conta não mandarem em dobro. O agente não confirma
 * sucesso (só avisa falha), então marcar antes é o único jeito — e
 * avisoFalhou() devolve a vez quando a ponta não conseguiu.
 */
export async function proximoAviso(orgId: string): Promise<{ telefone: string; texto: string } | null> {
  try {
    const admin = createAdminClient();
    const { data: prox } = await admin
      .from("avisos_zap")
      .select("id, telefone, texto")
      .eq("org_id", orgId)
      .eq("status", "pendente")
      .order("created_at")
      .limit(1)
      .maybeSingle();
    const aviso = prox as { id: string; telefone: string; texto: string } | null;
    if (!aviso) return null;

    const { data: reserva } = await admin
      .from("avisos_zap")
      .update({ status: "enviado", enviado_em: new Date().toISOString() })
      .eq("id", aviso.id)
      .eq("status", "pendente")
      .select("id");
    if (!reserva || reserva.length === 0) return null; // outro agente levou
    return { telefone: aviso.telefone, texto: aviso.texto };
  } catch {
    return null;
  }
}

// O envio falhou na ponta: o aviso mais recente volta para a fila.
export async function avisoFalhou(orgId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: ultimo } = await admin
      .from("avisos_zap")
      .select("id")
      .eq("org_id", orgId)
      .eq("status", "enviado")
      .gte("enviado_em", new Date(Date.now() - 10 * 60_000).toISOString())
      .order("enviado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    const id = (ultimo as { id: string } | null)?.id;
    if (id) await admin.from("avisos_zap").update({ status: "pendente", enviado_em: null }).eq("id", id);
  } catch {
    /* sem drama */
  }
}

/* --------------------------- textos dos avisos ---------------------------- */

const ROTULO_PLANO: Record<string, string> = {
  prospector: "Prospector",
  pro: "Pro",
  agencia: "Agência",
};

export function textoNovoTeste(dados: { empresa: string; email: string | null; ate: string; dias: number }) {
  return {
    titulo: "🎁 Alguém entrou no teste grátis do Prospector",
    linhas: [
      `Empresa: ${dados.empresa}`,
      dados.email ? `E-mail: ${dados.email}` : "",
      `Teste de ${dados.dias} dias, até ${new Date(dados.ate).toLocaleDateString("pt-BR")}`,
    ].filter(Boolean),
  };
}

export function textoNovaVenda(dados: {
  plano: string;
  valor: string;
  empresa: string;
  email: string | null;
  vindoDoTeste: boolean;
}) {
  return {
    titulo: `💰 Nova assinatura: ${ROTULO_PLANO[dados.plano] ?? dados.plano} · ${dados.valor}`,
    linhas: [
      `Empresa: ${dados.empresa}`,
      dados.email ? `E-mail: ${dados.email}` : "",
      dados.vindoDoTeste ? "Veio do teste grátis 🎯" : "",
    ].filter(Boolean),
  };
}
