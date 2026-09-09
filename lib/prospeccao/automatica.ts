/*
 * "Isto foi uma pessoa respondendo, ou o robô da empresa?"
 *
 * Metade das empresas que a gente aborda tem resposta automática no WhatsApp
 * Business: "seja bem-vindo, você está falando com o atendimento da X". O
 * agente escuta isso e, sem esta peneira, trata como resposta de verdade —
 * o que dá três estragos de uma vez:
 *
 *   1. manda a APRESENTAÇÃO para um robô (e a apresentação fura o limite do
 *      dia e a cadência, porque foi feita para quem acabou de responder de
 *      verdade — uma leva de robôs viraria uma rajada de mensagens);
 *   2. move o lead para "Responderam" no funil, enchendo o kanban de lead
 *      que ninguém leu;
 *   3. pode acionar a IA de classificação e o Fechador, gastando crédito
 *      para responder a um menu de atendimento.
 *
 * Puro e sem banco de propósito: é a regra que decide se um lead é quente,
 * e isso precisa ser testável sem Supabase e sem WhatsApp.
 *
 * O erro seguro aqui é o CONTRÁRIO do resto do sistema: na dúvida, tratar
 * como gente. Perder um lead de verdade por achar que era robô é pior do
 * que mandar uma apresentação a mais para um robô — por isso as pistas são
 * poucas e explícitas, nada de "achismo" por tamanho ou emoji.
 */

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // tira acento: "automática" = "automatica"
    .replace(/\s+/g, " ")
    .trim();

/*
 * Pistas FORTES: uma só já decide. São frases que ninguém escreve na mão
 * respondendo a um "oi, tudo bem?" — só saem de robô configurado.
 */
const FORTES: RegExp[] = [
  /mensagem (e |eh |é )?automatica/,
  /resposta automatica/,
  /este (e |eh |é )?um atendimento automatico/,
  /voce esta (conversando|falando) com o (atendimento|assistente|canal)/,
  /voce esta no (atendimento|canal)/,
  /seja bem[- ]?vindo/,
  /bem[- ]?vindo\(a\)/,
  /obrigad[oa] por (entrar em contato|nos contatar|sua mensagem)/,
  /recebemos (a )?sua mensagem/,
  /sua mensagem foi recebida/,
  /(em breve|assim que possivel|em instantes|logo mais) (um|uma|nossa|nosso|a nossa|o nosso)? ?(atendente|consultor|equipe|especialista)? ?(ira|vai|entrara|retornara|respondera)/,
  /retornaremos (o seu|seu|o) contato/,
  /nosso (horario|horário) de (atendimento|funcionamento)/,
  /estamos (fora do|ausentes|indisponiveis)/,
  /no momento (nao|não) (podemos|conseguimos) (atender|responder)/,
  /digite (o numero|o n°|1|um) (da opcao|para|correspondente)/,
  /escolha (uma|a) opcao/,
  /para (falar com|atendimento) (um|uma|nosso|nossa)? ?(atendente|consultor|vendedor).{0,20}digite/,
  /aguarde(,| que)? (em breve|logo|um)/,
];

/*
 * Pistas FRACAS: sozinhas não valem — gente também escreve "bom dia" e cita
 * o nome da empresa. Duas juntas já desenham o formato de um robô.
 */
const FRACAS: RegExp[] = [
  /atendimento ao cliente/,
  /central de atendimento/,
  /horario comercial/,
  /segunda a sexta/,
  /seg a sex/,
  /das \d{1,2}h?(:\d{2})? ?(as|ate) ?\d{1,2}h/,
  /nossa equipe/,
  /nosso time/,
  /nossos atendentes/,
  /estamos (aqui|a disposicao|à disposicao) para/,
  /como podemos (te )?ajudar/,
  /em que posso (te )?ajudar/,
  /fique a vontade/,
  /nao responda esta mensagem/,
];

export type Veredito = {
  automatica: boolean;
  /* Que pista decidiu — vai para o log e para a tela, para dar para conferir. */
  motivo: string | null;
};

/*
 * O texto veio de um robô? `ehRespostaAutomatica` é a pergunta simples;
 * `analisarResposta` devolve também o porquê.
 */
export function analisarResposta(texto: string): Veredito {
  const t = normalizar(texto);
  if (!t) return { automatica: false, motivo: null };

  /*
   * Resposta curta é de gente, quase sempre: "sim", "quem é?", "não tenho
   * interesse". Robô se apresenta, e apresentação ocupa espaço. Este piso
   * evita que um "bem-vindo!" solto de um dono simpático caia na peneira.
   */
  if (t.length < 40) return { automatica: false, motivo: null };

  for (const r of FORTES) {
    const m = t.match(r);
    if (m) return { automatica: true, motivo: `frase de atendimento automático ("${m[0].slice(0, 60)}")` };
  }

  const achadas = FRACAS.map((r) => t.match(r)?.[0]).filter(Boolean) as string[];
  if (achadas.length >= 2) {
    return { automatica: true, motivo: `formato de mensagem de atendimento ("${achadas.slice(0, 2).join('", "')}")` };
  }

  return { automatica: false, motivo: null };
}

export function ehRespostaAutomatica(texto: string): boolean {
  return analisarResposta(texto).automatica;
}

/*
 * O que há de NOVO em relação ao que já lemos.
 *
 * O agente lê as últimas bolhas recebidas da conversa, então depois de uma
 * resposta automática a leitura seguinte vem com ela de novo, colada no que
 * a pessoa escreveu. Sem tirar a parte velha, o robô contaminaria para
 * sempre a classificação de todas as respostas daquele lead.
 *
 * Devolve string vazia quando não há nada novo — é o sinal de "já vi isto,
 * não faça nada".
 */
export function parteNova(textoAtual: string, jaVisto: string | null): string {
  const atual = textoAtual.trim();
  const velho = (jaVisto ?? "").trim();
  if (!velho) return atual;
  if (atual === velho) return "";
  if (atual.startsWith(velho)) return atual.slice(velho.length).trim();
  // O agente manda as últimas 3 bolhas: a velha pode ter saído da janela.
  if (velho.startsWith(atual)) return "";
  return atual;
}
