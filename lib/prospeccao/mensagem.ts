/*
 * Monta a mensagem de abordagem, personalizada por empresa.
 *
 * Duas coisas acontecem aqui, e as duas importam:
 *   1. Variáveis  {empresa}, {ramo}, {bairro}, {avaliacoes}, {nota}
 *   2. Variações  [Oi|Olá|Opa] — sorteia uma opção a cada mensagem
 *
 * A variação não é enfeite: mensagem idêntica repetida é o sinal mais óbvio
 * de disparo em massa, e é o que faz o WhatsApp bloquear o número. Texto
 * diferente a cada envio também converte melhor, porque não parece robô.
 *
 * Puro de propósito: roda no painel e no agente, e dá para testar.
 */

import { acharNicho } from "./nichos";

export const MODELO_PADRAO = `[Olá|Oi]{contato}! Tudo bem?

Meu nome é {meunome}. [Encontrei|Achei] a {empresa} pesquisando empresas{regiao} e vi que vocês têm uma presença interessante na região.

[Eu trabalho com|Trabalho com] criação de sites para empresas e estou fazendo um projeto de sites personalizados para negócios locais.

Acabei criando, por iniciativa própria, uma versão de como poderia ser o site da {empresa}, já pensando em apresentar os serviços e transformar as visitas em contatos pelo WhatsApp.

Não tem compromisso nenhum. Fiz como demonstração mesmo.

Posso te mandar o link [para você ver como ficou|para você dar uma olhada]?`;

/*
 * A segunda mensagem, do follow-up. Mais curta que a primeira de propósito:
 * quem não respondeu não vai ler dois parágrafos de novo. E a saída fácil
 * ("é só me dizer e eu não incomodo mais") vem escrita — é o que mantém a
 * insistência dentro do limite da educação.
 */
export const MODELO_FOLLOWUP_PADRAO = `[Oi|Olá]{contato}, tudo certo?

[Passando aqui de novo|Voltando aqui rapidinho] só para não deixar passar: cheguei a comentar que fiz uma demonstração de site para a {empresa}.

Se não for o momento, sem problema nenhum — é só me dizer e eu não incomodo mais. Mas se quiser dar uma olhada, mando o link agora. 🙂`;

/*
 * Os modelos do modo Prospector: quem vende o PRÓPRIO produto (seguro, plano
 * de saúde, consórcio). {oferta} é preenchida pelo resumo configurado no
 * painel — sem site, sem demonstração: a permissão pedida no fim é para
 * mandar mais detalhes, que é o passo honesto quando não há nada pronto para
 * mostrar.
 */
export const MODELO_PADRAO_PROPRIA = `[Olá|Oi]{contato}! Tudo bem?

Meu nome é {meunome}. [Encontrei|Achei] a {empresa} pesquisando empresas de {ramo}{regiao}{prova}.

[Eu trabalho com|Trabalho com] {oferta} e atendo [empresas|negócios] como o seu aqui da região.

Não quero tomar seu tempo — posso te mandar [um resumo rápido|duas linhas] de como funciona, sem compromisso?`;

export const MODELO_FOLLOWUP_PROPRIA = `[Oi|Olá]{contato}, tudo certo?

[Passando aqui de novo|Voltando rapidinho] só para não deixar passar: te mandei uma mensagem sobre {oferta}.

Se não for o momento, sem problema nenhum — é só me dizer e eu não incomodo mais. Mas se quiser, te explico em duas linhas. 🙂`;

export type DadosEmpresa = {
  nome: string;
  nicho_busca?: string | null;
  categoria?: string | null;
  endereco?: string | null;
  local_busca?: string | null;
  avaliacoes?: number | null;
  nota_media?: number | null;
};

/*
 * Sorteia uma opção de cada bloco [a|b|c]. A semente vem do id do prospecto,
 * então a mesma empresa sempre recebe a mesma versão — importante para a
 * prévia do painel bater com o que é realmente enviado.
 */
function semente(texto: string): () => number {
  let h = 2166136261;
  for (const ch of `pp-abordagem::${texto}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  const proximo = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  // Aquece o gerador: sem isto, chaves parecidas caem na mesma opção do
  // primeiro bloco — e todas as mensagens começariam igual, que é exatamente
  // o padrão que o WhatsApp usa para detectar disparo.
  for (let i = 0; i < 8; i++) proximo();
  return proximo;
}

export function sortearVariacoes(texto: string, chave: string): string {
  const proximo = semente(chave);
  return texto.replace(/\[([^\][]+)\]/g, (todo, dentro: string) => {
    const opcoes = dentro.split("|").map((o) => o.trim());
    if (opcoes.length < 2) return todo;
    return opcoes[Math.floor(proximo() * opcoes.length)] ?? opcoes[0];
  });
}

// Bairro a partir do endereço ("Av. X, 100 · Barra da Tijuca · Rio de Janeiro").
function bairroDe(e: DadosEmpresa): string {
  const partes = e.endereco?.split("·").map((p) => p.trim()) ?? [];
  return partes[1] || e.local_busca?.split(",")[0]?.trim() || "";
}

// A prova social é opcional: sem avaliação, a frase some em vez de virar
// "vocês têm 0 avaliações", que soa péssimo.
function provaDe(e: DadosEmpresa): string {
  const n = e.avaliacoes ?? 0;
  if (n < 5) return "";
  const nota = e.nota_media && e.nota_media >= 4 ? ` e nota ${String(e.nota_media).replace(".", ",")}` : "";
  return ` e vi que vocês têm ${n} avaliações${nota} — sinal de que o pessoal gosta mesmo do trabalho`;
}

export function ramoDe(e: DadosEmpresa): string {
  const rotulo = acharNicho(e.nicho_busca ?? "")?.rotulo;
  if (rotulo) return rotulo.split("/")[0].trim().toLowerCase();
  // Nicho digitado à mão ("loja de aquário") é o próprio ramo, e melhor que
  // a categoria do Google, que vem em formato de cadastro.
  if (e.nicho_busca?.trim()) return e.nicho_busca.trim().toLowerCase();
  return e.categoria?.toLowerCase() || "negócios locais";
}

/*
 * Limpa o nome que vem do Google Maps.
 *
 * Muita empresa enche o cadastro de palavra-chave para aparecer na busca:
 * "Dentista no Recreio dos Bandeirantes | Dra. Carolina Kede". Escrever isso
 * numa mensagem entrega na hora que foi robô que montou.
 *
 * Regra: entre os pedaços separados por | ou –, fica o que traz o nome de uma
 * pessoa (Dr./Dra.); não havendo, fica o primeiro, que costuma ser a marca.
 */
export function limparNomeEmpresa(bruto: string): string {
  const partes = bruto
    .split(/\s*[|–—]\s*|\s+-\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (partes.length === 0) return bruto.trim();

  const comPessoa = partes.find((p) => /^(Dr|Dra)\.?\s+[A-ZÁÂÃÉÊÍÓÔÕÚÇ]/.test(p));
  const escolhida = comPessoa ?? partes[0];

  // Tira sobras de localização no fim ("... Barra da Tijuca RJ").
  return escolhida.replace(/[,\s]+(RJ|SP|MG|BA|RS|PR|SC|GO|PE|CE|DF)$/i, "").trim();
}

/*
 * Nome de quem atende, para tratar a pessoa e não a empresa.
 *
 * O Google Maps não traz o nome do dono, então só extraímos quando a própria
 * placa diz ("Dra. Juliana Fernandes"). Chutar o nome a partir do nome da
 * empresa daria "Olá, Clínica!" — pior do que não usar nome nenhum.
 */
export function contatoDe(nome: string): string {
  const m = /^(Dr|Dra|Dr\.|Dra\.)\s+([A-ZÁÂÃÉÊÍÓÔÕÚÇ][a-záâãéêíóôõúç]+)/.exec(
    limparNomeEmpresa(nome),
  );
  if (!m) return "";
  const titulo = m[1].replace(/\.?$/, ".");
  return `, ${titulo} ${m[2]}`;
}

/*
 * "aqui em Recreio dos Bandeirantes".
 *
 * Usamos "em" e não "da/do" de propósito: o artigo muda com o bairro ("da
 * Barra", "do Recreio", "de Copacabana") e errar isso entrega o robô. "em"
 * funciona com todos.
 */
function regiaoDe(e: DadosEmpresa): string {
  const bairro = bairroDe(e);
  return bairro ? ` aqui em ${bairro}` : "";
}

export function montarMensagem(
  modelo: string,
  empresa: DadosEmpresa,
  chave: string,
  remetente = "",
  extras: Record<string, string> = {},
): string {
  const nome = limparNomeEmpresa(empresa.nome);
  const valores: Record<string, string> = {
    empresa: nome,
    ramo: ramoDe(empresa),
    bairro: bairroDe(empresa),
    regiao: regiaoDe(empresa),
    contato: contatoDe(nome),
    meunome: remetente,
    avaliacoes: String(empresa.avaliacoes ?? ""),
    nota: empresa.nota_media ? String(empresa.nota_media).replace(".", ",") : "",
    prova: provaDe(empresa),
    // {oferta} e afins: variáveis que não vêm da empresa, vêm de quem envia.
    ...extras,
  };

  const comVariacoes = sortearVariacoes(modelo || MODELO_PADRAO, chave);
  return comVariacoes
    .replace(/\{(\w+)\}/g, (todo, chaveVar: string) => valores[chaveVar] ?? todo)
    // Limpezas de pontuação que sobram quando uma variável vem vazia.
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([.,!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/*
 * Normaliza o telefone para o formato que o WhatsApp aceita (DDI + DDD +
 * número, só dígitos). Devolve null para fixo: WhatsApp em fixo é raro e
 * mandar para lá só gera erro e desconfiança.
 */
export function telefoneWhatsapp(bruto: string | null | undefined): string | null {
  if (!bruto) return null;
  let d = bruto.replace(/\D/g, "");
  if (d.startsWith("0")) d = d.replace(/^0+/, "");
  if (d.startsWith("55")) d = d.slice(2);
  // Celular brasileiro: DDD (2) + 9 + 8 dígitos.
  if (!/^\d{2}9\d{8}$/.test(d)) return null;
  return `55${d}`;
}
