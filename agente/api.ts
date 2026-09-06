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

/*
 * O token identifica a conta inteira — por HTTP puro ele viaja legível para
 * qualquer um no meio do caminho (o Wi-Fi do café, o provedor). Painel em
 * http:// só vale apontando para a própria máquina, em desenvolvimento.
 */
const httpInseguro =
  BASE.startsWith("http://") && !/^http:\/\/(localhost|127\.|\[::1\])/i.test(BASE);

export function configurado(): boolean {
  return !!BASE && !!TOKEN && !httpInseguro;
}

export function faltaConfig(): string {
  if (!BASE) return "Falta PAGINAPRO_URL no arquivo .env";
  if (httpInseguro) {
    return "PAGINAPRO_URL precisa começar com https:// — por http o seu código de acesso viaja aberto pela rede.";
  }
  if (!TOKEN) return "Falta PAGINAPRO_TOKEN no arquivo .env";
  return "";
}

/*
 * Token separado para o Estúdio de Vídeos.
 *
 * Este PC pode rodar o agente numa conta de teste, enquanto a fila de vídeo
 * é da conta ADMIN. Com PAGINAPRO_TOKEN_ESTUDIO no .env, a mesma máquina
 * atende as duas contas sem misturar dado nenhum. Sem ele, usa o token
 * normal (o caso de quem roda tudo na mesma conta).
 */
const TOKEN_ESTUDIO = (process.env.PAGINAPRO_TOKEN_ESTUDIO || "").trim() || TOKEN;

async function chamar<T>(
  acao: string,
  dados: Record<string, unknown> = {},
  token = TOKEN,
): Promise<T> {
  const res = await fetch(`${BASE}/api/agente`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
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

/* --------------------------------- versão --------------------------------- */
/*
 * Conta ao painel qual versão está rodando e pergunta se o dono pediu
 * atualização. `atual` é a versão que o painel tem para entregar; o painel
 * compara as duas para mostrar "desatualizado" na tela do agente.
 */
export const versao = (local: string) =>
  chamar<{ atual: string | null; atualizar: boolean }>("versao", { versao: local });

// Os arquivos novos, para a instalação por zip escrever por cima dos seus.
export const pacote = () =>
  chamar<{ arquivos: Record<string, string> }>("pacote").then((r) => r.arquivos);

/* ------------------------------ fila de buscas ---------------------------- */
export type Tarefa = {
  id: string;
  tipo: string;
  nicho: string | null;
  local: string | null;
  limite: number;
  prospecto_id: string | null;
  /* O que o cliente pediu na tela. Nulo em busca sem filtro e em painel
     que ainda não rodou a migração — nos dois casos, grava tudo. */
  filtros?: unknown;
};

/*
 * O painel avisa junto com a fila se o dono clicou em Atualizar. O aviso fica
 * guardado aqui até o serviço perguntar — assim o clique age na volta
 * seguinte (~8s), e não na checagem de 5 em 5 minutos.
 */
let avisoDeAtualizacao = false;
export const atualizacaoPedida = (): boolean => {
  const v = avisoDeAtualizacao;
  avisoDeAtualizacao = false;
  return v;
};

export const proximaTarefa = () =>
  chamar<{ tarefa: Tarefa | null; atualizar?: boolean }>("proxima_tarefa").then((r) => {
    if (r.atualizar) avisoDeAtualizacao = true;
    return r.tarefa;
  });

export const progresso = (id: string, progresso: number, total: number) =>
  chamar("progresso", { id, progresso, total });

export const fimTarefa = (
  id: string,
  dados: { status: string; erro?: string | null; gravadas?: number; progresso?: number },
) => chamar("fim_tarefa", { id, ...dados });

/* Quais destes fonte_ids já estão na lista da organização. */
export const jaExistem = (fonteIds: string[]) =>
  chamar<{ existentes: string[] }>("ja_existem", { fonte_ids: fonteIds }).then((r) => r.existentes);

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

/* --------------------------------- espelho --------------------------------- */
export const gravarEspelho = (dados: { id: string; ok: boolean; base64?: string; erro?: string | null }) =>
  chamar<{ ok: boolean; erro?: string }>("gravar_espelho", dados);

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
    /*
     * Apresentações na fila: a segunda mensagem de quem RESPONDEU ao gancho.
     * É continuação de conversa que o lead abriu, não contato novo — por isso
     * sai mesmo com a cota do dia esgotada. Servidor antigo não manda o campo.
     */
    continuacoes?: number;
    /* Freio de mão puxado no painel: nada de envio até o dono retomar. */
    pausado?: boolean;
    /* As linhas de WhatsApp da conta. Servidor antigo não manda: uma linha só. */
    linhas?: LinhaInfo[];
  }>("abordagem_estado");

/* --------------------------------- escuta --------------------------------- */
// Por linha: cada WhatsApp só enxerga as conversas que ELE abriu.
export const aguardandoResposta = (linhaId?: string | null) =>
  chamar<{ numeros: string[] }>("aguardando_resposta", linhaId ? { linha_id: linhaId } : {}).then(
    (r) => r.numeros,
  );

export const respostaRecebida = (telefone: string, texto: string) =>
  chamar<{ ok: boolean; classe: string | null }>("resposta_recebida", { telefone, texto });

/* ------------------------------ resumo diário ------------------------------ */
export const resumoPendente = () =>
  chamar<{ resumo: { telefone: string; texto: string } | null }>("resumo_pendente").then(
    (r) => r.resumo,
  );

export const resumoFalhou = () => chamar("resumo_falhou");

/* --------------------------- estúdio de vídeos ---------------------------- */
export type ProjetoVideo = {
  id: string;
  titulo: string;
  roteiro: string;
  termos: string[];
  formato_16x9: boolean;
  duracao_alvo_s: number;
  musica: string;
  musica_volume: number;
};

export type AchadoSemTexto = { id: string; video_id: string; titulo: string | null };

export const transcricaoPendente = () =>
  chamar<{ achado: AchadoSemTexto | null }>("transcricao_pendente", {}, TOKEN_ESTUDIO).then(
    (r) => r.achado,
  );

export const transcricaoGravar = (id: string, texto: string | null) =>
  chamar("transcricao_gravar", { id, texto }, TOKEN_ESTUDIO);

export const videoProximo = () =>
  chamar<{ projeto: ProjetoVideo | null }>("video_proximo", {}, TOKEN_ESTUDIO).then((r) => r.projeto);

export const videoProgresso = (id: string, progresso: string) =>
  chamar("video_progresso", { id, progresso }, TOKEN_ESTUDIO);

export const videoFim = (dados: {
  id: string;
  ok: boolean;
  arquivo?: string;
  arquivo_16x9?: string;
  erro?: string;
}) => chamar("video_fim", dados, TOKEN_ESTUDIO);

/*
 * Tudo abaixo aceita `linhaId`: qual dos WhatsApps desta conta está falando.
 * Sem ele (agente antigo, ou conta com um número só) o servidor entende a
 * linha principal — a do perfil de sempre.
 */
export const zapEstado = (estado: string, mensagem?: string, qr?: string | null, linhaId?: string | null) =>
  chamar("zap_estado", {
    estado,
    mensagem,
    ...(qr !== undefined ? { qr } : {}),
    ...(linhaId ? { linha_id: linhaId } : {}),
  });

export const zapDesconectado = (linhaId?: string | null) =>
  chamar("zap_desconectado", linhaId ? { linha_id: linhaId } : {});

/*
 * As linhas que o painel conhece. `minha` = este agente segura a sessão;
 * sem agente e pedindo QR = livre para quem chegar primeiro reivindicar.
 */
export type LinhaInfo = {
  id: string;
  nome: string;
  principal: boolean;
  status: "desconectado" | "aguardando_qr" | "conectado" | "erro";
  desconectar_pedido: boolean;
  agente_id: string | null;
  minha: boolean;
  /* Sem dono, ou dono calado há 15 min — pode ser reivindicada. */
  livre?: boolean;
  ativa: boolean;
};

export const linhaReivindicar = (linhaId: string) =>
  chamar<{ ok: boolean }>("linha_reivindicar", { linha_id: linhaId }).then((r) => r.ok);

export type MensagemPendente = {
  id: string;
  prospecto_id: string;
  telefone: string;
  texto: string;
};

export const proximaMensagem = (linhaId?: string | null) =>
  chamar<{ mensagem: MensagemPendente | null; motivo?: string }>(
    "proxima_mensagem",
    linhaId ? { linha_id: linhaId } : {},
  );

export const fimMensagem = (dados: {
  id: string;
  prospecto_id?: string;
  ok: boolean;
  semWhatsapp?: boolean;
  erro?: string;
  linha_id?: string | null;
  // A sessão caiu no meio: a mensagem volta para a fila, outra linha assume.
  pararTudo?: boolean;
}) => chamar("fim_mensagem", { ...dados, linha_id: dados.linha_id ?? undefined });
