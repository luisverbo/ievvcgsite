import "server-only";

import { getMinhaOrg } from "./queries";
import { ehAdmin } from "./admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { situacaoDaAssinatura, type AssinaturaRow } from "@/lib/pagamentos/estado";

/*
 * Quem pode usar o quê.
 *
 * Toda a regra de plano mora aqui. Mudar preço ou pacote é mexer nesta tabela
 * e mais nada — espalhar `if (plano === 'pro')` pelas telas é como se perde o
 * controle de quem tem direito a quê.
 *
 * Ferramenta interna (ebook, painel de admin) NÃO entra aqui: ela não é do
 * produto, é sua. Continua atrás do ehAdmin().
 */

export type Recurso =
  // Construtor de páginas com IA. O freio é o crédito, não o plano — é ele que
  // faz a compra de crédito acontecer.
  | "construtor"
  // Prospecção no Google + WhatsApp. Exige o agente instalado na máquina do
  // cliente, então é só do plano completo.
  | "prospeccao"
  /*
   * A camada de IA DA PROSPECÇÃO: mensagens escritas uma a uma pela IA e
   * leitura automática das respostas.
   *
   * Separada da prospecção de propósito. O Prospector é vendido como
   * ferramenta de custo fixo — nada de consumo por lead — e sem este recurso
   * ele roda inteiro sem gastar um centavo de IA: o modelo de mensagem com
   * variações e o remarketing são texto puro.
   */
  | "prospeccao_ia"
  /*
   * O resumo diário no WhatsApp do dono. Não custa IA (é consulta ao banco),
   * mas é recurso do produto completo — no Prospector a tela já mostra tudo.
   */
  | "prospeccao_resumo"
  // Hospedar com domínio próprio.
  | "hospedagem";

/*
 * `cota` é o crédito de IA que entra todo mês, em microdólares.
 *
 * Referência para calibrar: uma página cheia custa ~US$0,51 no Opus 5 (o
 * modelo do cliente) e ~US$1,06 no Fable 5 (só admin). US$15 no Agência dá
 * umas 27 páginas por mês antes de o cliente precisar comprar crédito — e é
 * o que sobra de margem nos R$300.
 */
/*
 * `sites` é quantos sites o plano hospeda em domínio próprio, sem custo extra.
 *
 * O teto NÃO é técnico — a Vercel aceita 50 domínios por projeto no Hobby e
 * não tem limite prático no Pro. É comercial: um cliente com 40 sites no ar
 * consome banda e suporte de 40 sites pagando por um. A cota é o que faz o
 * cliente que cresce pagar proporcionalmente ao que usa.
 *
 * Por que Agência tem 10 e não 3: o Agência é para quem revende. Dar folga
 * aqui é o que faz ele sair vendendo — e cada site que ele vende é receita
 * recorrente sua também, via site extra.
 */
export const PLANOS: Record<
  string,
  { rotulo: string; recursos: Recurso[]; cota: number; sites: number }
> = {
  /*
   * O grátis é uma DEGUSTAÇÃO, não um plano: 1 página, gerada uma vez, a
   * partir de um único pedido — publica no endereço interno e pronto. Sem
   * chat de edição, sem domínio próprio. Os limites moram nas ações (criar
   * página, chat), não aqui; aqui só o que ele enxerga de recurso.
   *
   * A cota de US$1,50 existe para UMA geração completa caber inteira
   * (a página mais cara custa ~US$1,06 no Fable) — cota menor deixaria a
   * degustação morrer no meio, que é a pior primeira impressão possível.
   *
   * Ele ainda pode ser desligado por completo no Admin (plano_free_ativo).
   */
  free: { rotulo: "Grátis", recursos: ["construtor"], cota: 1_500_000, sites: 0 },
  // Fora de linha: definido para o futuro, mas nenhum checkout vende o Pro
  // hoje — o produto é vendido num plano só, o Agência.
  pro: { rotulo: "Pro", recursos: ["construtor", "hospedagem"], cota: 5_000_000, sites: 3 },
  /*
   * O Prospector: SÓ a prospecção, vendido separado, para quem prospecta o
   * próprio produto (seguro, plano de saúde, consórcio, representação).
   * Sem construtor e sem hospedagem de propósito — é outro público e outro
   * preço; quem quiser sites sobe para o Agência.
   *
   * ZERO IA, por decisão do dono: nada neste plano chama Anthropic nem
   * OpenAI, e por isso a cota é 0 — a margem do Prospector não depende de
   * quanto o cliente usa. Sem "Mensagens com cérebro" e sem a leitura
   * automática das respostas; o que o cliente manda são os modelos prontos
   * por ramo, ajustados por ele.
   *
   * O agente continua inteiro: ele é quem varre o Google Maps, monta a
   * lista, envia no ritmo de gente, cuida da cadência de remarketing e avisa
   * quem respondeu. Nada disso passa por modelo de linguagem.
   *
   * O resumo diário fica de fora (recurso do produto completo).
   */
  prospector: {
    rotulo: "Prospector",
    recursos: ["prospeccao"],
    cota: 0,
    sites: 0,
  },
  agencia: {
    rotulo: "Agência",
    recursos: [
      "construtor",
      "prospeccao",
      "prospeccao_ia",
      "prospeccao_resumo",
      "hospedagem",
    ],
    cota: 15_000_000,
    sites: 10,
  },
};

/*
 * O plano grátis está aberto para novos usuários?
 *
 * Interruptor do dono, em config_sistema (chave plano_free_ativo, "1"/"0").
 * DESLIGADO por padrão: com ele desligado, quem se cadastra precisa assinar
 * para usar o construtor. Ligado, vale a degustação descrita acima.
 *
 * É configuração de banco, não variável de ambiente, de propósito: liga e
 * desliga na hora, sem redeploy — campanha no ar, botão no Admin.
 */
export async function planoFreeAtivo(): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("config_sistema")
    .select("valor")
    .eq("chave", "plano_free_ativo")
    .maybeSingle();
  return (data as { valor: string } | null)?.valor?.trim() === "1";
}

// Quantas páginas de IA o grátis cria. Uma: é degustação.
export const FREE_MAX_PAGINAS = 1;

export function cotaDoPlano(plano: string | null | undefined): number {
  return PLANOS[plano ?? "free"]?.cota ?? 0;
}

export function sitesDoPlano(plano: string | null | undefined): number {
  return PLANOS[plano ?? "free"]?.sites ?? 0;
}

export function planoLibera(plano: string | null | undefined, recurso: Recurso): boolean {
  return PLANOS[plano ?? "free"]?.recursos.includes(recurso) ?? false;
}

/*
 * Checagem do usuário logado. O dono do sistema passa em tudo — sem isso você
 * teria que se colocar num plano para usar o próprio produto.
 *
 * Assinatura suspensa cai para o plano grátis. Não é o mesmo que perder a
 * conta: o painel abre, os dados continuam lá e voltar é pagar. Durante a
 * tolerância de 7 dias nada muda — quem está atrasado continua com tudo.
 */
export async function podeUsar(recurso: Recurso): Promise<boolean> {
  if (await ehAdmin()) return true;
  const org = await getMinhaOrg();
  if (!org) return false;
  const plano = await planoVigente(org.id, org.plano);
  // Grátis desligado no Admin = grátis sem acesso a nada. A conta continua
  // existindo; o caminho passa a ser assinar.
  if (plano === "free" && !(await planoFreeAtivo())) return false;
  return planoLibera(plano, recurso);
}

/*
 * A mesma pergunta, mas SEM usuário logado — por organização.
 *
 * Existe para o que roda fora de uma tela: o Fechador dispara a partir de uma
 * resposta que o agente escutou, sem sessão nenhuma. Sem esta função ele
 * chamaria a geração de página direto, e uma conta só de prospecção ganharia
 * site automático que o plano dela não vende.
 *
 * Não tem atalho de admin de propósito: aqui não há "usuário atual" para ser
 * admin. Quem é dono do sistema tem a org dele no plano que quiser.
 */
export async function orgPodeUsar(orgId: string, recurso: Recurso): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("organizacoes")
    .select("plano")
    .eq("id", orgId)
    .maybeSingle();
  const contratado = (data as { plano: string } | null)?.plano;
  if (!contratado) return false;

  const plano = await planoVigente(orgId, contratado);
  if (plano === "free" && !(await planoFreeAtivo())) return false;
  return planoLibera(plano, recurso);
}

/*
 * O plano que vale AGORA, já considerando a assinatura.
 *
 * O campo `plano` da organização diz o que foi contratado; a assinatura diz se
 * está pago. Quem manda no acesso é o segundo.
 */
export async function planoVigente(orgId: string, planoContratado: string): Promise<string> {
  if (planoContratado === "free") return "free";

  const admin = createAdminClient();
  const { data } = await admin
    .from("assinaturas")
    .select("plano, pago_ate, status, falhou_em")
    .eq("org_id", orgId)
    .maybeSingle();

  const assinatura = data as AssinaturaRow | null;
  // Sem linha de assinatura = plano liberado na mão por você, no Admin.
  // Nesse caso o contratado vale — senão você não conseguiria dar cortesia.
  if (!assinatura) return planoContratado;

  return situacaoDaAssinatura(assinatura).liberado ? planoContratado : "free";
}
