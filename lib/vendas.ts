/*
 * Conteúdo da página de vendas.
 *
 * Fica separado do layout de propósito: mudar preço, promessa ou link de
 * assinatura é mexer aqui, sem entrar no meio do JSX e sem risco de quebrar a
 * página.
 */

/* ------------------------- LINKS DOS BOTÕES ------------------------------
 * É AQUI que você troca para onde os botões levam.
 *
 * O padrão manda para o cadastro, e o cliente assina dentro do painel (é o
 * caminho que já funciona sozinho, com webhook, tolerância e tudo). Se um dia
 * quiser mandar direto para um link de pagamento da Stripe, cole ele em
 * NEXT_PUBLIC_LINK_ASSINATURA na Vercel — ou troque o texto abaixo.
 * ------------------------------------------------------------------------ */
export const LINK_ASSINATURA = process.env.NEXT_PUBLIC_LINK_ASSINATURA || "/cadastro";
export const LINK_TESTE = process.env.NEXT_PUBLIC_LINK_TESTE || "/cadastro";
export const LINK_WHATSAPP =
  process.env.NEXT_PUBLIC_WHATSAPP_VENDAS || "https://wa.me/5521999999999";

export const PRECO_MENSAL = Number(process.env.NEXT_PUBLIC_PRECO_MENSAL) || 300;

/* --------------------------------- dores --------------------------------- */

export const DORES: { titulo: string; texto: string }[] = [
  {
    titulo: "Você cobra R$1.500 e entrega em 3 semanas",
    texto:
      "Briefing, layout, aprovação, ajuste, mais ajuste. Quando o site fica pronto, o cliente já esfriou — e você ganhou por um mês de trabalho o que devia ganhar por uma semana.",
  },
  {
    titulo: "Achar cliente é mais difícil que fazer o site",
    texto:
      "Você sabe fazer. O problema é para quem vender. Indicação acaba, grupo de WhatsApp satura, e prospectar na mão é ligar para lista fria sem saber quem precisa.",
  },
  {
    titulo: "Cada site é um projeto novo do zero",
    texto:
      "Nada acumula. Terminou um, começa outro do nada. Não existe receita recorrente: se você parar um mês, seu faturamento é zero.",
  },
];

/* ------------------------------ como funciona ---------------------------- */

export const PASSOS: { numero: string; titulo: string; texto: string }[] = [
  {
    numero: "01",
    titulo: "Escolha o nicho e a região",
    texto:
      "“Dentista na Barra da Tijuca”. O sistema varre o Google Maps e traz as empresas com telefone, endereço, avaliações e se elas já têm site.",
  },
  {
    numero: "02",
    titulo: "Veja quem vale a pena",
    texto:
      "Cada empresa recebe uma nota de 0 a 100. Quem não tem site pontua alto — é a venda mais fácil que existe. Quem já tem site moderno vai para o fim da fila.",
  },
  {
    numero: "03",
    titulo: "Fale com elas no WhatsApp",
    texto:
      "Mensagem personalizada com o nome da empresa e do bairro, enviada no seu ritmo, com intervalo humano. Você aprova cada uma, ou deixa no automático.",
  },
  {
    numero: "04",
    titulo: "Quem responder, ganha o site pronto",
    texto:
      "A IA cria a landing page inteira em minutos — com o texto do ramo dela, as fotos do Instagram dela e o botão de WhatsApp funcionando. Você manda o link e cobra.",
  },
];

/* ------------------------------ o que inclui ----------------------------- */

export const RECURSOS: { icone: string; titulo: string; texto: string }[] = [
  {
    icone: "✨",
    titulo: "Criador de sites com IA",
    texto:
      "Descreva o negócio e a página nasce inteira: textos, seções, cores, animações. Depois é só conversar para ajustar — “deixa o botão maior”, “troca a cor”.",
  },
  {
    icone: "🎯",
    titulo: "Prospecção no Google Maps",
    texto:
      "Empresas por nicho e região, com nota de potencial. O sistema encontra quem ainda não tem site — que é exatamente quem precisa de você.",
  },
  {
    icone: "💬",
    titulo: "Abordagem no WhatsApp",
    texto:
      "Primeira mensagem personalizada, com limite diário e intervalo aleatório para o número não cair. Manual ou automático, você escolhe.",
  },
  {
    icone: "📸",
    titulo: "Fotos reais do cliente",
    texto:
      "O sistema lê o Instagram da empresa e usa as fotos dela no site. O cliente reconhece a própria loja na tela — vende sozinho.",
  },
  {
    icone: "🌐",
    titulo: "Hospedagem com domínio próprio",
    texto:
      "O site do seu cliente no domínio dele, com certificado de segurança automático. Você cobra a mensalidade e não mexe em servidor nenhum.",
  },
  {
    icone: "📊",
    titulo: "Métricas de verdade",
    texto:
      "Visitas, cliques em cada botão, de onde veio a pessoa e a que horas. É com isso que você justifica a mensalidade e segura o cliente.",
  },
  {
    icone: "📥",
    titulo: "Download do site em .zip",
    texto:
      "Quer hospedar em outro lugar? Baixa o HTML pronto e sobe onde quiser. O site é seu, sem prisão.",
  },
  {
    icone: "🎨",
    titulo: "Pixel e anúncios",
    texto:
      "Pixel do Facebook em um campo, sem mexer em código. Funciona até em páginas que você já criou.",
  },
];

/* --------------------------------- FAQ ----------------------------------- */

export const PERGUNTAS: { pergunta: string; resposta: string }[] = [
  {
    pergunta: "Preciso saber programar?",
    resposta:
      "Não. Você conversa com a IA em português, como conversaria com um designer. “Quero uma página para uma clínica de estética na Tijuca, com agendamento pelo WhatsApp” — e a página aparece.",
  },
  {
    pergunta: "Como funciona o crédito de IA?",
    resposta:
      "Todo mês entram US$15 de crédito no seu plano, o suficiente para umas 14 páginas completas. Se precisar de mais, compra crédito avulso no cartão ou no Pix. E se você já tem conta na Anthropic, pode colar a sua própria chave e não gastar crédito nenhum.",
  },
  {
    pergunta: "A prospecção é legal? Meu número pode ser bloqueado?",
    resposta:
      "Os dados são públicos — os mesmos que aparecem quando você pesquisa no Google. O envio tem limite diário e intervalo aleatório justamente para não parecer robô, e você controla o ritmo. Ainda assim, use um chip separado: é a recomendação honesta para qualquer abordagem em volume.",
  },
  {
    pergunta: "Posso cobrar quanto eu quiser dos meus clientes?",
    resposta:
      "Pode. O que você cobra é entre você e o seu cliente — a gente não entra nisso e não fica com porcentagem. A média do mercado para uma landing page é R$800 a R$2.500, mais mensalidade de hospedagem.",
  },
  {
    pergunta: "E se eu quiser cancelar?",
    resposta:
      "Cancela pelo próprio painel, em dois cliques, sem falar com ninguém. O que você já pagou continua valendo até o fim do mês, e os sites que você baixou continuam seus.",
  },
  {
    pergunta: "O que acontece se meu cartão falhar?",
    resposta:
      "Nada sai do ar na hora. Você tem 7 dias para regularizar, com aviso na tela, e pode pagar aquele mês no Pix se preferir. Seus sites e os dos seus clientes continuam funcionando nesse período.",
  },
];

/* ------------------------------- incluso --------------------------------- */

export const NO_PLANO: string[] = [
  "Sites com IA ilimitados",
  "US$15 de crédito de IA por mês",
  "Prospecção no Google Maps",
  "Abordagem no WhatsApp (manual e automática)",
  "Captura de Instagram das empresas",
  "Hospedagem com domínio próprio",
  "Métricas de visitas e cliques",
  "Download do site em .zip",
  "Pixel do Facebook",
  "Suporte direto comigo",
];
