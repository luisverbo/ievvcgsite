/*
 * Conversa do agente com o painel.
 *
 * O agente NÃO fala mais com o banco. Ele bate numa porta só, com um token
 * que vale apenas para a organização dona dele — assim o agente de um cliente
 * nunca enxerga a fila, os prospectos ou as chaves de outro.
 *
 * Toda chamada que falha por rede devolve erro em vez de derrubar o serviço:
 * a internet do cliente cai, e o agente tem que sobreviver a isso.
 */

const BASE = (process.env.PAGINAPRO_URL || "").replace(/\/$/, "");
const TOKEN = (process.env.PAGINAPRO_TOKEN || "").trim();

export function configurado(): boolean {
  return !!BASE && !!TOKEN;
}

export function faltaConfig(): string {
  if (!BASE) return "Falta PAGINAPRO_URL no arquivo .env";
  if (!TOKEN) return "Falta PAGINAPRO_TOKEN no arquivo .env";
  return "";
}

async function chamar<T>(acao: string, dados: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${BASE}/api/agente`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ acao, ...dados }),
    // Coleta e envio são lentos; o servidor tem 300s.
    signal: AbortSignal.timeout(300_000),
  });

  if (res.status === 401) {
    throw new Error("Token recusado. Gere um novo no painel, em Prospecção › Meu agente.");
  }
  if (!res.ok) {
    const texto = await res.text().catch(() => "");
    throw new Error(`Painel respondeu ${res.status}: ${texto.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

/* --------------------------------- presença ------------------------------- */
export const ping = () => chamar<{ ok: boolean; agente: string }>("ping");

/* ------------------------------ fila de buscas ---------------------------- */
export type Tarefa = {
  id: string;
  tipo: string;
  nicho: string | null;
  local: string | null;
  limite: number;
  prospecto_id: string | null;
};

export const proximaTarefa = () =>
  chamar<{ tarefa: Tarefa | null }>("proxima_tarefa").then((r) => r.tarefa);

export const progresso = (id: string, progresso: number, total: number) =>
  chamar("progresso", { id, progresso, total });

export const fimTarefa = (
  id: string,
  dados: { status: string; erro?: string | null; gravadas?: number; progresso?: number },
) => chamar("fim_tarefa", { id, ...dados });

export const gravarEmpresas = (nicho: string, local: string, empresas: unknown[]) =>
  chamar<{ gravadas: number; oportunidades: number; quentes: number }>("gravar_empresas", {
    nicho,
    local,
    empresas,
  });

/* -------------------------------- instagram ------------------------------- */
export type ProspectoIG = {
  id: string;
  nome: string;
  instagram: string | null;
  website: string | null;
};

export const prospectoIg = (id: string) =>
  chamar<{ prospecto: ProspectoIG | null }>("prospecto_ig", { id }).then((r) => r.prospecto);

export const gravarInstagram = (dados: {
  id: string;
  status: string;
  erro?: string | null;
  dados?: { nome?: string; bio?: string; seguidores?: number; posts?: number };
  fotos?: { base64: string; legenda?: string }[];
}) => chamar<{ ok: boolean; fotos: number }>("gravar_instagram", dados);

/* -------------------------------- abordagem ------------------------------- */
export type ConfigAbordagem = {
  org_id: string;
  limite_diario: number;
  intervalo_min_s: number;
  intervalo_max_s: number;
  whatsapp_status: string;
  desconectar_pedido: boolean;
};

export const abordagemEstado = () =>
  chamar<{
    config: ConfigAbordagem;
    enviadasHoje: number;
    pendentes: number;
    aguardando: number;
    resumoDevido: boolean;
  }>("abordagem_estado");

/* --------------------------------- escuta --------------------------------- */
export const aguardandoResposta = () =>
  chamar<{ numeros: string[] }>("aguardando_resposta").then((r) => r.numeros);

export const respostaRecebida = (telefone: string, texto: string) =>
  chamar<{ ok: boolean; classe: string | null }>("resposta_recebida", { telefone, texto });

/* ------------------------------ resumo diário ------------------------------ */
export const resumoPendente = () =>
  chamar<{ resumo: { telefone: string; texto: string } | null }>("resumo_pendente").then(
    (r) => r.resumo,
  );

export const resumoFalhou = () => chamar("resumo_falhou");

export const zapEstado = (estado: string, mensagem?: string, qr?: string | null) =>
  chamar("zap_estado", { estado, mensagem, ...(qr !== undefined ? { qr } : {}) });

export const zapDesconectado = () => chamar("zap_desconectado");

export type MensagemPendente = {
  id: string;
  prospecto_id: string;
  telefone: string;
  texto: string;
};

export const proximaMensagem = () =>
  chamar<{ mensagem: MensagemPendente | null }>("proxima_mensagem").then((r) => r.mensagem);

export const fimMensagem = (dados: {
  id: string;
  prospecto_id?: string;
  ok: boolean;
  semWhatsapp?: boolean;
  erro?: string;
}) => chamar("fim_mensagem", dados);
