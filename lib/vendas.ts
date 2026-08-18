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
    titulo: "Quem responder, ganha o site na hora",
    texto:
      "O agente entende a resposta e, se for interesse, o site daquela empresa nasce sozinho — com as fotos do Instagram dela — e a mensagem com o link fica pronta. Você revisa, manda e cobra. E depois vê quando ele abriu o site.",
  },
];

/* ------------------------------ o ciclo ---------------------------------- *
 * O que mudou no produto e precisa mudar no discurso: antes o agente parava
 * em "puxou conversa". Agora ele fecha a volta inteira — escuta, entende,
 * cria o site, entrega, mede e insiste. É a diferença entre vender uma
 * ferramenta de prospecção e vender um vendedor que não dorme.
 *
 * Cada passo aqui existe de verdade no sistema. Nenhum é promessa futura —
 * landing que promete o que não entrega gera reembolso, não venda.
 * -------------------------------------------------------------------------- */

export const CICLO: {
  emoji: string;
  titulo: string;
  texto: string;
  /* A frase curta que aparece como "prova" — o que o cliente vê na tela. */
  prova: string;
}[] = [
  {
    emoji: "🔎",
    titulo: "Encontra quem precisa",
    texto:
      "Varre o Google Maps atrás das empresas do nicho e da região que você escolheu, e dá nota de 0 a 100 para cada uma. Quem não tem site pontua alto — é a venda mais fácil que existe.",
    prova: "“Dentista · Barra da Tijuca — nota 94, só Instagram”",
  },
  {
    emoji: "🧠",
    titulo: "Escreve uma mensagem para cada uma",
    texto:
      "Você conta em três linhas quem é você e o que oferece. A IA escreve uma mensagem DIFERENTE para cada empresa, citando o ramo, o bairro e as avaliações dela. Mensagem única não tem cara de disparo — é a melhor proteção que existe para o seu número.",
    prova: "Placar honesto: “seu modelo 11% · IA 19%” de resposta",
  },
  {
    emoji: "👂",
    titulo: "Escuta o que responderam",
    texto:
      "O agente vê a resposta chegar no WhatsApp e a IA entende o que ela quer dizer: interesse, pergunta de preço, dúvida ou recusa. O painel se marca sozinho — e quem pediu para não receber sai de todas as filas, para sempre, automaticamente.",
    prova: "“Respondeu com interesse 🎯” aparece no card, com o texto dele",
  },
  {
    emoji: "⚡",
    titulo: "Cria o site e manda o link",
    texto:
      "Respondeu com interesse? O site daquela empresa nasce sozinho — com as fotos do Instagram dela — e a mensagem com o link fica pronta. Você escolhe até onde ele vai: só avisar, deixar pronto para você dar o clique, ou entregar sozinho.",
    prova: "Com teto de gasto mensal que você define. Bateu, ele para e avisa.",
  },
  {
    emoji: "🪞",
    titulo: "Mostra o antes e o depois",
    texto:
      "Se a empresa já tem um site velho, o agente tira uma foto dele e monta uma página de comparação: o site de hoje de um lado, o novo funcionando do outro. Nenhum argumento de venda supera colocar os dois lado a lado.",
    prova: "Uma página só, com o link pronto para mandar na conversa",
  },
  {
    emoji: "🌡️",
    titulo: "Avisa quando ele está olhando",
    texto:
      "Cada lead recebe um endereço exclusivo. Quando ele abre o site, você fica sabendo — e quantas vezes. Quem abriu três vezes hoje está pensando na proposta: é a hora de ligar, não amanhã.",
    prova: "“Abriu o site 3 vezes · última há 20 min — liga agora!”",
  },
  {
    emoji: "↩️",
    titulo: "Insiste uma vez, com educação",
    texto:
      "A maioria dos leads não diz “não” — esquece. Quem ficar em silêncio recebe uma segunda mensagem, depois dos dias que você escolher. Uma só, para sempre: insistir duas vezes vira perseguição e derruba número.",
    prova: "Com a saída fácil escrita no texto — quem recusa, sai da lista",
  },
  {
    emoji: "📬",
    titulo: "Te dá o resumo no fim do dia",
    texto:
      "No horário que você escolher, o agente te manda no WhatsApp o balanço do dia: quantas saíram, quem respondeu o quê, quais sites foram entregues e quem está com o site aberto agora. Dia parado não gera mensagem — quando o resumo chega, é porque teve novidade.",
    prova: "Chega no seu WhatsApp como qualquer mensagem",
  },
];

/* -------------------- depois da venda: o que segura o cliente ------------- */

export const RETENCAO: { emoji: string; titulo: string; texto: string }[] = [
  {
    emoji: "📄",
    titulo: "Relatório mensal, pronto para mandar",
    texto:
      "Quem paga a mensalidade não abre painel — vê a fatura chegar. Todo mês você manda um link que mostra, na língua dele: “143 pessoas visitaram seu site, 19 clicaram para falar com você”. É o que transforma o boleto em algo visível — e o que faz ele não cancelar.",
  },
  {
    emoji: "📈",
    titulo: "A IA lê as métricas e diz o que mudar",
    texto:
      "Ela cruza os números reais da página com o texto dela e devolve até três mudanças concretas, cada uma citando o número que a motivou: “62% param antes da metade — suba o botão de WhatsApp”. Um clique abre o pedido pronto para aplicar.",
  },
];

/* ------------------------- os 4 pilares, a fundo -------------------------- *
 * Produto de ticket alto se vende com PROFUNDIDADE: quem vai pagar R$147 ou
 * R$300 por mês quer entender o que está levando, não ler slogan. Cada pilar
 * ganha uma explicação de verdade + o detalhe que prova que é sério.
 * -------------------------------------------------------------------------- */

export const PILARES: {
  /* Liga o pilar à tela desenhada em components/vendas/Telas.tsx. */
  tela: "criador" | "buscador" | "whatsapp" | "dominio";
  icone: string;
  chapeu: string;
  titulo: string;
  texto: string;
  detalhes: string[];
}[] = [
  {
    tela: "criador",
    icone: "✨",
    chapeu: "Pilar 1 · Produção",
    titulo: "A IA escreve o site inteiro — e você conversa até ficar perfeito",
    texto:
      "Não é template com espaço para preencher. Você descreve o negócio (“clínica de estética na Tijuca, agendamento pelo WhatsApp”) e a IA escreve a página completa: títulos, textos de venda, seções, cores, animações. Saiu diferente do que imaginou? Fala com ela como falaria com um designer: “deixa o botão maior”, “troca essa foto”, “põe uma seção de depoimentos”. Cada pedido vira uma nova versão — e dá para voltar às anteriores.",
    detalhes: [
      "Fotos reais: anexe as fotos do cliente (ou deixe o sistema puxar do Instagram dele) e elas entram no site",
      "Cada imagem tem botão de trocar, gerar de novo ou remover — sem regerar a página",
      "Histórico de versões: errou, volta",
      "Página publicada na hora, com endereço próprio e certificado de segurança",
    ],
  },
  {
    tela: "buscador",
    icone: "🎯",
    chapeu: "Pilar 2 · Clientes",
    titulo: "O sistema encontra quem precisa de site na sua cidade",
    texto:
      "Você escolhe o nicho e a região — “dentista na Barra”, “oficina em Campinas” — e o sistema varre o Google Maps e traz as empresas com telefone, endereço, avaliações e, o principal: se já têm site ou não. Cada uma recebe uma nota de 0 a 100. Quem não tem site pontua alto, porque é a venda mais fácil que existe. Você para de adivinhar para quem vender.",
    detalhes: [
      "Filtro por situação: sem site, só Instagram, site antigo",
      "Fotos e dados do Instagram da empresa entram no site que você gera para ela",
      "Da lista para a página pronta: um clique gera o site daquela empresa",
      "Quem abriu o site que você mandou sobe para o topo da lista, com o 🔥 e o horário",
      "A lista é sua — exporta, filtra, organiza por status de conversa",
    ],
  },
  {
    tela: "whatsapp",
    icone: "💬",
    chapeu: "Pilar 3 · Abordagem",
    titulo: "A primeira mensagem sai no WhatsApp, no seu ritmo",
    texto:
      "De que adianta a lista se você não fala com ela? O sistema escreve a mensagem personalizada — nome da empresa, bairro, o que ela não tem — e envia pelo SEU WhatsApp, com limite diário e intervalo aleatório para parecer o que é: uma pessoa oferecendo um serviço. Você aprova mensagem por mensagem, ou deixa a fila andar sozinha e só responde quem se interessar.",
    detalhes: [
      "A IA escreve uma mensagem diferente para cada empresa — com placar comparando a conversão dela contra a do seu modelo",
      "Envio manual (você aprova cada uma) ou automático com limite diário e intervalo humano",
      "Ele ESCUTA a resposta e entende: interesse, preço, dúvida ou recusa — o painel se marca sozinho",
      "Quem pede para não receber sai de todas as filas, para sempre, sem você fazer nada",
      "Follow-up automático: quem ficou em silêncio recebe uma segunda mensagem. Uma só.",
      "O agente roda no seu computador: o número é seu, a conta é sua, o controle é seu",
    ],
  },
  {
    tela: "dominio",
    icone: "🌐",
    chapeu: "Pilar 4 · Recorrência",
    titulo: "Hospedagem no domínio do cliente — a sua mensalidade",
    texto:
      "Site entregue é dinheiro uma vez. Site HOSPEDADO é mensalidade para sempre. Você conecta o domínio do cliente (clinicasorriso.com.br) em dois cliques, o certificado de segurança sai sozinho, e toda atualização que você fizer entra no ar em um minuto. O mercado cobra de R$70 a R$150 por mês por isso — e o seu custo já está dentro do plano.",
    detalhes: [
      "Instrução de DNS pronta para o cliente (Registro.br, GoDaddy, Hostinger…)",
      "Certificado https automático, renovado sozinho",
      "Relatório mensal com link próprio: você manda, ele vê o que o site fez por ele — e não cancela",
      "A IA lê as métricas da página e sugere o que mudar, com botão de aplicar",
      "Pixel do Facebook em um campo, para vender tráfego como serviço extra",
    ],
  },
];

/* ------------------------- para quem é (e não é) -------------------------- */

export const PARA_QUEM: string[] = [
  "Você já vende site (ou serviço digital) e quer parar de caçar cliente no escuro",
  "Você quer montar uma renda recorrente com hospedagem, não só projetos avulsos",
  "Você atende negócio local — dentista, advogado, salão, oficina, restaurante",
  "Você entende que ferramenta boa é investimento: ela se paga no primeiro cliente",
];

export const NAO_E_PARA: string[] = [
  "Quem procura “fazer um site grátis” — existe ferramenta grátis por aí, essa aqui não é",
  "Quem quer spam: o envio tem limite diário de propósito, e a conta é o SEU número",
  "Quem não vai atender as respostas — o sistema abre a conversa, quem fecha é você",
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
    icone: "👂",
    titulo: "O agente escuta as respostas",
    texto:
      "Ele vê a resposta chegar e a IA entende: interesse, preço, dúvida ou recusa. O painel se marca sozinho — e quem pede para não receber sai de todas as filas para sempre.",
  },
  {
    icone: "⚡",
    titulo: "Site automático na resposta",
    texto:
      "Respondeu com interesse? O site nasce sozinho, com as fotos do Instagram dela, e a mensagem com o link fica pronta. Com teto de gasto que você define.",
  },
  {
    icone: "🌡️",
    titulo: "Você vê quando ele abre o site",
    texto:
      "Link exclusivo por lead: “abriu 3 vezes, a última há 20 minutos”. Quem está com o site aberto agora é para quem você liga hoje.",
  },
  {
    icone: "🪞",
    titulo: "O antes e o depois",
    texto:
      "O site velho da empresa de um lado, o novo funcionando do outro, na mesma página. É o argumento de venda que não precisa de texto.",
  },
  {
    icone: "↩️",
    titulo: "Follow-up automático",
    texto:
      "Quem não respondeu recebe uma segunda mensagem, uma única vez, no prazo que você escolher. Com a saída fácil escrita — quem recusa sai da lista sozinho.",
  },
  {
    icone: "📬",
    titulo: "Resumo diário no seu WhatsApp",
    texto:
      "No fim do dia, o balanço chega no seu celular: enviadas, respostas, sites entregues e os leads quentes. Dia parado não gera mensagem.",
  },
  {
    icone: "📄",
    titulo: "Relatório mensal do seu cliente",
    texto:
      "Um link que você manda todo mês mostrando o que o site fez por ele. É o que justifica a mensalidade e segura o contrato.",
  },
  {
    icone: "📈",
    titulo: "Otimizador de páginas",
    texto:
      "A IA lê as métricas reais e sugere até 3 mudanças concretas, citando o número que motivou cada uma. Um clique abre o pedido pronto.",
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
      "Todo mês entra crédito novo no seu plano: US$5 no Pro e US$15 no Agência. Como uma página completa custa cerca de US$0,50, isso dá aproximadamente 10 páginas por mês no Pro e quase 30 no Agência — e ajustes no chat custam bem menos que uma página nova. Se precisar de mais, compra crédito avulso no cartão ou no Pix. E se você já tem conta na Anthropic, pode colar a sua própria chave: o sistema passa a usar ela, e se algum dia ela ficar sem crédito, cai automaticamente no crédito da plataforma para o seu trabalho não travar.",
  },
  {
    pergunta: "A prospecção é legal? Meu número pode ser bloqueado?",
    resposta:
      "Os dados são públicos — os mesmos que aparecem quando você pesquisa no Google. O envio tem limite diário e intervalo aleatório justamente para não parecer robô, e você controla o ritmo. Ainda assim, use um chip separado: é a recomendação honesta para qualquer abordagem em volume.",
  },
  {
    pergunta: "O agente cria o site sozinho? Quanto isso custa de crédito?",
    resposta:
      "Só quando o lead responde com interesse — que é o melhor momento possível, e o único em que vale gastar. Cada site automático custa cerca de US$0,55 do seu crédito, e você define um teto de gasto por mês: bateu o teto, ele para de gerar e avisa. Você também escolhe até onde ele vai sozinho: só te avisar, deixar o site e a mensagem prontos para você dar o clique, ou entregar sozinho na conversa. O padrão é desligado — quem liga é você.",
  },
  {
    pergunta: "Como ele sabe que a pessoa abriu o site?",
    resposta:
      "Cada lead recebe um endereço exclusivo, só dele. Toda abertura daquele endereço é dele — e o sistema ainda descarta o robô de prévia do WhatsApp (que abre o link sozinho para montar o cartãozinho), as suas próprias visitas quando você está logado, e recarregadas em sequência. Sem isso, todo lead apareceria como “abriu na hora”, que é exatamente a informação errada. Não guardamos IP de ninguém.",
  },
  {
    pergunta: "Isso não vira spam?",
    resposta:
      "As travas são de propósito e nenhuma delas dá para desligar: uma abordagem por empresa, um follow-up por empresa (só um, para sempre), limite diário, intervalo aleatório e opt-out definitivo — quem responde “não quero” sai de todas as filas na hora, automaticamente, e nenhuma fila futura consegue passar por cima disso. O texto padrão do follow-up já vem com a saída fácil escrita.",
  },
  {
    pergunta: "Quantos sites eu posso hospedar?",
    resposta:
      "O Pro hospeda 3 sites em domínio próprio; o Agência, 10. Passou disso, cada site a mais custa R$ 29,90 por mês, cobrado na sua assinatura — você aprova antes, e sai da conta sozinho se você desconectar o domínio. Como o mercado cobra de R$70 a R$150 pela mensalidade de um site, cada site extra ainda deixa lucro no seu bolso.",
  },
  {
    pergunta: "Qual a diferença entre o Pro e o Agência?",
    resposta:
      "O Pro é a fábrica: criar páginas com IA sem limite, hospedar até 3 sites em domínio próprio, o otimizador que lê as métricas e o relatório mensal para os seus clientes. O Agência é a fábrica MAIS o vendedor completo: prospecção no Google Maps com nota de potencial, abordagem no WhatsApp com mensagem escrita pela IA, o agente que escuta as respostas, cria o site na hora, mostra quem abriu, faz o follow-up e te manda o resumo do dia — além de 10 sites hospedados e o triplo de crédito. Se a sua dúvida é “onde vou achar cliente?”, a resposta é o Agência.",
  },
  {
    pergunta: "Preciso deixar meu computador ligado?",
    resposta:
      "Só para a abordagem automática no WhatsApp: o agente roda na sua máquina (ou numa VPS), porque o número é seu e o controle tem que ser seu. Todo o resto — criar páginas, hospedar, ver métricas — roda nos nossos servidores, com o seu computador desligado.",
  },
  {
    pergunta: "Posso mudar de plano depois?",
    resposta:
      "Pode. Dá para começar no Pro e subir para o Agência quando quiser fazer prospecção — a troca vale já na fatura seguinte. E cancelar é no painel, em dois cliques.",
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

// Precisa bater com PLANOS.pro em lib/painel/permissoes.ts.
export const NO_PRO: string[] = [
  "Páginas com IA ilimitadas, editadas no chat",
  "US$5 de crédito de IA por mês (~10 páginas)",
  "Hospedagem de 3 sites em domínio próprio",
  "Fotos reais, versões e download em .zip",
  "Métricas de visitas e pixel do Facebook",
  "Otimizador: a IA lê as métricas e sugere melhorias",
  "Relatório mensal para mandar ao seu cliente",
];

/*
 * O Agência. Tudo que envolve o AGENTE mora aqui — em permissoes.ts é o
 * recurso "prospeccao" que libera o pacote inteiro. A lista precisa bater
 * com aquilo: prometer na landing o que a permissão bloqueia é reembolso.
 */
export const NO_PLANO: string[] = [
  "Tudo do Pro, com US$15 de crédito por mês (~30 páginas)",
  "Prospecção no Google Maps com nota de potencial",
  "Mensagem escrita pela IA para cada empresa, com placar de conversão",
  "Abordagem no WhatsApp (manual e automática)",
  "O agente escuta as respostas e classifica sozinho",
  "Site automático quando o lead responde, com teto de gasto",
  "Termômetro: você vê quem abriu o site e quantas vezes",
  "Comparação “hoje × amanhã” do site atual do lead",
  "Follow-up automático de quem não respondeu",
  "Resumo do dia no seu WhatsApp",
  "Captura de Instagram das empresas",
  // Precisa bater com PLANOS.agencia.sites em lib/painel/permissoes.ts.
  "Hospedagem de 10 sites em domínio próprio",
  "Suporte direto comigo",
];
