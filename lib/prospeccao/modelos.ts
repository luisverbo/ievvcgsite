/*
 * Modelos de primeira mensagem, prontos por tipo de venda.
 *
 * A tela em branco é onde o cliente novo trava: ele assina, abre a
 * abordagem, vê uma caixa de texto vazia e adia — e quem adia o primeiro
 * envio não volta. Estes modelos existem para o primeiro disparo sair no
 * dia da assinatura.
 *
 * Todos seguem as mesmas regras da casa: sem link, sem preço, sem promessa
 * de prazo, com as variáveis que personalizam ({empresa}, {regiao}, {prova})
 * e variações [a|b] que impedem duas mensagens iguais. Terminam pedindo
 * PERMISSÃO — é isso que separa abordagem de spam, e é o que mantém o
 * número do cliente vivo.
 */

export type ModeloPronto = {
  chave: string;
  rotulo: string;
  /* Para quem este texto foi escrito — aparece embaixo do nome na tela. */
  publico: string;
  texto: string;
};

export const MODELOS_PRONTOS: ModeloPronto[] = [
  {
    chave: "seguros",
    rotulo: "🛡️ Seguros",
    publico: "corretor de seguros (auto, vida, empresarial)",
    texto: `[Olá|Oi]{contato}! Tudo bem?

Meu nome é {meunome}. [Encontrei|Achei] a {empresa}{regiao}{prova}.

[Eu trabalho com|Trabalho com] seguros e atendo bastante [empresa|negócio] daqui da região. Costumo conseguir a mesma cobertura por um valor melhor do que a maioria está pagando hoje — e sem trocar de seguradora às pressas.

Não quero tomar seu tempo: posso te mandar [uma comparação rápida|dois números] do que dá para economizar, sem compromisso?`,
  },
  {
    chave: "plano_saude",
    rotulo: "🏥 Plano de saúde",
    publico: "corretor de plano de saúde empresarial",
    texto: `[Olá|Oi]{contato}! Tudo bem?

Meu nome é {meunome} e [encontrei|achei] a {empresa}{regiao}{prova}.

[Trabalho com|Eu trabalho com] plano de saúde empresarial. Muita empresa com poucos funcionários não sabe que [se enquadra|tem direito] na tabela de CNPJ, que costuma sair bem abaixo do plano individual.

Posso te mandar [os valores para o seu porte|uma simulação rápida], sem compromisso nenhum?`,
  },
  {
    chave: "consorcio",
    rotulo: "🏠 Consórcio / Crédito",
    publico: "vendedor de consórcio, financiamento ou crédito",
    texto: `[Olá|Oi]{contato}! Tudo bem?

{meunome} aqui. [Encontrei|Achei] a {empresa}{regiao}{prova}.

[Trabalho com|Eu trabalho com] consórcio — é o caminho que muita empresa usa para trocar de equipamento, veículo ou imóvel [sem os juros do financiamento|sem pagar juros].

Posso te explicar em [duas linhas|poucas linhas] como funciona? Se não fizer sentido agora, é só me dizer.`,
  },
  {
    chave: "representacao",
    rotulo: "📦 Representação / Distribuição",
    publico: "representante comercial e distribuidor",
    texto: `[Olá|Oi]{contato}! Tudo bem?

Meu nome é {meunome}. [Encontrei|Achei] a {empresa}{regiao} e imaginei que faça sentido.

[Sou representante|Trabalho como representante] e atendo [comércios|negócios] daqui da região, com [condição melhor no volume|preço de distribuidor] e entrega própria.

Posso te mandar a [tabela|lista] para você comparar com o que paga hoje?`,
  },
  {
    chave: "contabilidade",
    rotulo: "🧾 Contabilidade / BPO",
    publico: "escritório contábil e serviços financeiros",
    texto: `[Olá|Oi]{contato}! Tudo bem?

Meu nome é {meunome} e [encontrei|achei] a {empresa}{regiao}{prova}.

[Trabalho com|Eu trabalho com] contabilidade para [empresas como a sua|negócios daqui]. A migração é bem mais simples do que parece: a gente cuida de toda a papelada com o contador atual.

Posso te mandar [o que muda na prática|um resumo rápido], sem compromisso?`,
  },
  {
    chave: "energia_solar",
    rotulo: "☀️ Energia solar",
    publico: "vendedor de energia solar e eficiência",
    texto: `[Olá|Oi]{contato}! Tudo bem?

{meunome} aqui. [Encontrei|Achei] a {empresa}{regiao}{prova}.

[Trabalho com|Eu trabalho com] energia solar para [comércio|empresa]. Com a conta de luz de vocês eu consigo estimar em poucos minutos quanto sobraria por mês — e normalmente o valor da parcela fica abaixo da conta atual.

Posso fazer [essa conta|essa estimativa] para vocês, sem compromisso?`,
  },
  {
    chave: "marketing",
    rotulo: "📣 Marketing / Tráfego",
    publico: "agência, social media e gestor de tráfego",
    texto: `[Olá|Oi]{contato}! Tudo bem?

Meu nome é {meunome}. [Encontrei|Achei] a {empresa}{regiao}{prova} — sinal de que o trabalho de vocês é bem falado.

[Trabalho com|Eu trabalho com] divulgação para negócios locais, e é justamente [quem já tem cliente satisfeito|quem já entrega bem] que costuma dar mais resultado.

Posso te mandar [duas ideias|uma sugestão rápida] do que eu faria no seu caso?`,
  },
  {
    chave: "generico",
    rotulo: "✍️ Genérico (qualquer produto)",
    publico: "qualquer venda — só troque o que você oferece",
    texto: `[Olá|Oi]{contato}! Tudo bem?

Meu nome é {meunome}. [Encontrei|Achei] a {empresa}{regiao}{prova}.

[Trabalho com|Eu trabalho com] {oferta} e atendo [empresas|negócios] daqui da região.

Não quero tomar seu tempo: posso te mandar [um resumo rápido|duas linhas] de como funciona, sem compromisso?`,
  },
];
