import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { linhasDaOrg, restricoesDaOrg } from "./linhas";

/*
 * Aquecimento de linhas.
 *
 * Um número que nunca conversou e sai mandando mensagem para desconhecidos
 * é o retrato do spam para o WhatsApp. Aquecer é dar histórico a ele antes:
 * as linhas da própria conta trocam mensagens entre si (e num grupo, se o
 * dono criou um com todas), em ritmo de gente e nas horas de gente.
 *
 * Como funciona: a cada checagem de estado do agente (~20s), este módulo
 * decide se é hora de mais uma troca. Se for, escreve UMA mensagem na fila
 * (prospeccao_mensagens, tipo 'aquecimento', reservada à linha que fala) e o
 * agente daquela linha manda como manda qualquer outra. Quem responde é
 * outra linha, na troca seguinte — a conversa se alterna sozinha.
 *
 * O que ele NÃO faz: mandar fora de 8h–22h de Brasília; mandar por linha
 * restringida ou desligada; mandar duas ao mesmo tempo; e nunca é contato
 * com gente de fora — só os números da própria conta.
 *
 * Honestidade sobre o efeito: aquecer ajuda, não garante. O WhatsApp sabe
 * que o WhatsApp Web é um "dispositivo conectado" e olha muito mais para
 * quantos desconhecidos recebem mensagem por dia e quantos respondem ou
 * bloqueiam. O melhor aquecimento continua sendo usar o número de verdade
 * no celular.
 */

export const TIPO_AQUECIMENTO = "aquecimento";

// Nas horas de gente, em Brasília (UTC-3 o ano inteiro).
const HORA_INICIO = 8;
const HORA_FIM = 22;

export function horaBrasilia(agora = Date.now()): number {
  return new Date(agora - 3 * 3_600_000).getUTCHours();
}

export function dentroDoHorario(agora = Date.now()): boolean {
  const h = horaBrasilia(agora);
  return h >= HORA_INICIO && h < HORA_FIM;
}

/*
 * O que as linhas conversam. Frases curtas, do dia a dia, com pergunta e
 * resposta para a conversa ter ida e volta. Nada de venda, nada de link —
 * é conversa de gente que se conhece.
 */
const PERGUNTAS: [string, string[]][] = [
  ["Oi, tudo bem por aí?", ["Tudo sim, e você?", "Tudo certo! Correria, mas tudo bem", "Tudo ótimo 😄 e aí?"]],
  ["Viu a previsão pra amanhã?", ["Vi, parece que vai chover", "Não vi ainda, vou olhar", "Acho que vai fazer calor de novo"]],
  ["Já almoçou?", ["Já sim, e você?", "Ainda não, tô terminando umas coisas aqui", "Agora mesmo, fui no de sempre"]],
  ["Conseguiu resolver aquilo ontem?", ["Consegui sim, deu tudo certo", "Quase, falta um detalhe", "Ainda não, amanhã resolvo"]],
  ["Vai ter reunião hoje?", ["Vai, às 15h", "Acho que ficou pra amanhã", "Ainda não confirmaram"]],
  ["Que horas você chega?", ["Uns 20 minutos", "Tô saindo agora", "Devo chegar umas 18h"]],
  ["Viu o jogo?", ["Vi, que jogo foi aquele", "Só o segundo tempo", "Não consegui, como foi?"]],
  ["Pode me mandar aquele endereço?", ["Mando já", "Claro, um minuto", "Vou procurar aqui e te mando"]],
  ["Tá muito corrido aí hoje?", ["Bastante, mas tá indo", "Hoje tá tranquilo", "Correria normal 😅"]],
  ["A gente combina pra sexta?", ["Fechado, sexta então", "Sexta fica ótimo", "Deixa eu ver aqui e te confirmo"]],
  ["Chegou a encomenda?", ["Chegou hoje de manhã", "Ainda não, tá pra chegar", "Chegou sim, obrigado!"]],
  ["Você vai no almoço de domingo?", ["Vou sim", "Ainda não sei, te aviso", "Se der eu passo lá"]],
  ["Lembrou de pagar a conta?", ["Lembrei sim", "Vixe, vou pagar agora", "Já paguei ontem"]],
  ["Como foi o médico?", ["Foi bem, tudo certo", "Tranquilo, só rotina", "Marcou retorno pra semana que vem"]],
  ["Tem como me ligar mais tarde?", ["Tenho sim, te ligo depois das 18h", "Claro, que horas fica bom?", "Ligo assim que sair daqui"]],
];

const AVULSAS = [
  "Bom dia! ☀️",
  "Boa tarde!",
  "Boa noite 🌙",
  "Cheguei em casa agora",
  "Trânsito hoje tá impossível",
  "Depois te conto uma coisa",
  "Tô saindo do trabalho",
  "Que dia longo 😩",
  "Deu tudo certo aqui",
  "Valeu pela ajuda ontem!",
  "Bora marcar aquele café",
  "Amanhã eu te retorno",
  "Recebi, obrigado",
  "Vou dar uma olhada e te falo",
  "Ok, combinado",
  "Beleza 👍",
  "Hoje choveu muito aqui",
  "Tô quase terminando",
  "Já já te respondo direito",
  "Feriado vem aí, finalmente",
  "Tá calor demais hoje",
  "Vi sua mensagem, respondo já",
  "Boa semana pra você!",
  "Bom fim de semana!",
  "Acabei de ver, desculpa a demora",
  "Passo aí mais tarde",
  "Tá tudo bem por aqui",
  "Depois a gente conversa melhor",
  "Perfeito, obrigado!",
  "Estou na fila do banco 😅",
];

const sorteio = <T,>(lista: T[]): T => lista[Math.floor(Math.random() * lista.length)];

/*
 * O texto da vez: se a última mensagem da conversa foi uma pergunta, vem a
 * resposta dela; senão, ou uma pergunta nova (que a próxima troca responde)
 * ou uma avulsa. Sem repetir o que saiu por último.
 */
function proximoTexto(ultimoTexto: string | null, ultimos: string[]): string {
  const pergunta = PERGUNTAS.find(([p]) => p === ultimoTexto);
  if (pergunta) return sorteio(pergunta[1]);
  for (let i = 0; i < 8; i++) {
    const t = Math.random() < 0.45 ? sorteio(PERGUNTAS)[0] : sorteio(AVULSAS);
    if (!ultimos.includes(t)) return t;
  }
  return sorteio(AVULSAS);
}

type ConfigAquecimento = {
  aquecimento_ate: string | null;
  aquecimento_por_hora: number | null;
  aquecimento_grupo: string | null;
  aquecimento_ultimo_em: string | null;
};

/*
 * Enfileira a próxima troca do aquecimento, se for hora. Tolerante a tudo:
 * sem a migração, sem linhas com número, fora do horário — sai quieto.
 * Nunca lança: roda dentro da checagem de estado do agente.
 */
export async function prepararAquecimento(orgId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data: cfgRaw, error } = await admin
      .from("prospeccao_config")
      .select("aquecimento_ate, aquecimento_por_hora, aquecimento_grupo, aquecimento_ultimo_em")
      .eq("org_id", orgId)
      .maybeSingle();
    if (error || !cfgRaw) return false;
    const cfg = cfgRaw as ConfigAquecimento;
    if (!cfg.aquecimento_ate || new Date(cfg.aquecimento_ate).getTime() < Date.now()) return false;
    if (!dentroDoHorario()) return false;

    // Uma por vez: se a anterior ainda não saiu, espera.
    const { count: pendentes } = await admin
      .from("prospeccao_mensagens")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "pendente")
      .eq("tipo", TIPO_AQUECIMENTO);
    if ((pendentes ?? 0) > 0) return false;

    // O ritmo: N por hora, com sorteio em volta — cadência cravada é robô.
    const porHora = Math.min(12, Math.max(1, cfg.aquecimento_por_hora ?? 4));
    const base = 3_600_000 / porHora;
    const intervalo = base * (0.6 + Math.random() * 0.9);
    const ultimo = cfg.aquecimento_ultimo_em ? new Date(cfg.aquecimento_ultimo_em).getTime() : 0;
    if (Date.now() - ultimo < intervalo) return false;

    // Quem pode falar: linha ligada, conectada, com número e sem restrição.
    const [linhas, restricoes] = await Promise.all([linhasDaOrg(orgId), restricoesDaOrg(orgId)]);
    if (!linhas) return false;
    const { data: telRaw } = await admin.from("whatsapp_linhas").select("id, telefone").eq("org_id", orgId);
    const telefones = new Map(
      ((telRaw as { id: string; telefone: string | null }[] | null) ?? []).map((l) => [
        l.id,
        (l.telefone ?? "").replace(/\D/g, ""),
      ]),
    );
    const aptas = linhas.filter(
      (l) => l.ativa && l.status === "conectado" && !restricoes.has(l.id) && (telefones.get(l.id) ?? "").length >= 10,
    );
    const comNumero = linhas.filter((l) => (telefones.get(l.id) ?? "").length >= 10);
    const grupo = (cfg.aquecimento_grupo ?? "").trim() || null;
    // Precisa de duas linhas com número, ou uma linha e um grupo.
    if (aptas.length === 0 || (comNumero.length < 2 && !grupo)) return false;

    // A última troca: quem falou e o que disse, para alternar e responder.
    const { data: ultRaw } = await admin
      .from("prospeccao_mensagens")
      .select("linha_id, texto, grupo")
      .eq("org_id", orgId)
      .eq("tipo", TIPO_AQUECIMENTO)
      .order("created_at", { ascending: false })
      .limit(10);
    const ultimas = (ultRaw as { linha_id: string | null; texto: string; grupo: string | null }[] | null) ?? [];
    const ultima = ultimas[0] ?? null;

    // Alterna: quem NÃO falou por último fala agora, se puder.
    const candidatas = aptas.filter((l) => l.id !== ultima?.linha_id);
    const remetente = sorteio(candidatas.length > 0 ? candidatas : aptas);

    // Para quem: o grupo (se houver) em ~40% das vezes, senão outra linha.
    const outras = comNumero.filter((l) => l.id !== remetente.id);
    const noGrupo = grupo && (outras.length === 0 || Math.random() < 0.4);
    const destino = noGrupo ? null : sorteio(outras);
    if (!noGrupo && !destino) return false;

    const texto = proximoTexto(ultima?.texto ?? null, ultimas.map((u) => u.texto));

    const { error: eIns } = await admin.from("prospeccao_mensagens").insert({
      org_id: orgId,
      prospecto_id: null,
      telefone: destino ? telefones.get(destino.id) : telefones.get(remetente.id),
      texto,
      tipo: TIPO_AQUECIMENTO,
      modo: "auto",
      status: "pendente",
      linha_id: remetente.id,
      grupo: noGrupo ? grupo : null,
    });
    if (eIns) return false;

    await admin
      .from("prospeccao_config")
      .update({ aquecimento_ultimo_em: new Date().toISOString() })
      .eq("org_id", orgId);
    return true;
  } catch {
    return false;
  }
}
