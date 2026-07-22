// Catálogo de templates pré-configurados. Cada template é um conjunto de
// blocos com copy realista focada em conversão + um tema visual próprio
// (paleta de cores e fontes) para cada nicho ter identidade única.

import type { Tema } from "@/lib/types";

export type TemplateBloco = {
  tipo: string;
  config: Record<string, unknown>;
};

export type Template = {
  id: string;
  nome: string;
  categoria: string;
  nicho: string; // usado no onboarding para correspondência
  descricao: string;
  icone: string;
  tema?: Tema; // aplicado ao site quando criado a partir deste template
  blocos: TemplateBloco[];
};

export const TEMPLATES: Template[] = [
  /* ------------------------------------------------------------------ */
  /* EVENTO                                                              */
  /* ------------------------------------------------------------------ */
  {
    id: "evento",
    nome: "Evento",
    categoria: "Eventos",
    nicho: "evento",
    descricao: "Festa, show, congresso ou qualquer evento com venda de ingressos.",
    icone: "🎭",
    tema: {
      fonte_titulo: "Anton",
      cores: {
        night: "#160b20",
        night2: "#221331",
        night3: "#2f1c42",
        cream: "#fbf1df",
        creamDim: "#cdbccf",
        gold: "#f4a62a",
        coral: "#ef5b43",
        green: "#37b08a",
        pink: "#ea5c93",
        violet: "#9d6be0",
      },
    },
    blocos: [
      {
        tipo: "aviso",
        config: {
          texto: "🎟️ 2º lote com 30% de desconto até sexta",
          link_texto: "Garantir agora",
          href: "#oferta",
          cor: "gold",
        },
      },
      {
        tipo: "cabecalho",
        config: {
          nome: "Festival Cultural",
          botao: { texto: "Comprar ingresso", href: "#oferta", estilo: "primario", rastreio: "Cabecalho" },
        },
      },
      {
        tipo: "hero",
        config: {
          selo: "17 a 19 de Julho • Parque Central",
          titulo: "3 Dias do Maior Festival de Cultura da Cidade",
          subtitulo: "Música ao vivo, gastronomia de 16 países, arte e área kids. Uma experiência para toda a família.",
          alinhamento: "centro",
          botoes: [
            { texto: "Garantir meu ingresso", href: "#oferta", estilo: "primario", rastreio: "HeroPrincipal" },
            { texto: "Ver atrações", href: "#atracoes", estilo: "secundario", rastreio: "HeroSecundario" },
          ],
        },
      },
      {
        tipo: "estatisticas",
        config: {
          itens: [
            { numero: "+12.000", rotulo: "pessoas na última edição" },
            { numero: "20", rotulo: "shows ao vivo" },
            { numero: "16", rotulo: "países na gastronomia" },
            { numero: "10ª", rotulo: "edição do festival" },
          ],
        },
      },
      {
        tipo: "cards",
        config: {
          eyebrow: "Atrações",
          titulo: "O que você vai viver",
          colunas: 3,
          itens: [
            { emoji: "🎵", titulo: "Música ao vivo", texto: "Shows nacionais e locais em dois palcos, do fim da tarde até a meia-noite." },
            { emoji: "🍽️", titulo: "Gastronomia", texto: "Mais de 30 barracas com pratos típicos de 16 países para provar." },
            { emoji: "🎨", titulo: "Arte & Kids", texto: "Exposições, oficinas para crianças e apresentações culturais o dia todo." },
          ],
        },
      },
      {
        tipo: "midiatexto",
        config: {
          eyebrow: "A experiência",
          titulo: "Muito mais que um evento",
          corpo: "O Festival Cultural nasceu para unir gerações em torno de boa música, boa comida e boas memórias. A cada edição, milhares de famílias voltam — e trazem mais gente.",
          posicao: "esquerda",
          itens: ["Ambiente seguro para toda a família", "Estrutura coberta em caso de chuva", "Acessibilidade em todas as áreas"],
          botao: { texto: "Quero participar", href: "#oferta", estilo: "primario", rastreio: "MidiaTexto" },
        },
      },
      {
        tipo: "depoimentos",
        config: {
          eyebrow: "Quem já foi",
          titulo: "Palavra de quem viveu",
          itens: [
            { texto: "Levei minha família toda e foi o melhor dia do ano. Estrutura impecável e atrações de primeira!", autor: "Renata M. • edição 2024" },
            { texto: "A variedade de comida é surreal. Só o passaporte gastronômico já vale o ingresso.", autor: "Diego F. • edição 2024" },
          ],
        },
      },
      {
        tipo: "oferta",
        config: {
          eyebrow: "Ingressos",
          titulo: "Garanta no 2º lote",
          preco: 89,
          preco_sufixo: "por pessoa • acesso aos 3 dias",
          aviso: "Crianças até 12 anos não pagam. Preço sobe no próximo lote.",
          botao: { texto: "Comprar ingresso agora", href: "#", estilo: "primario", rastreio: "Comprar" },
        },
      },
      {
        tipo: "faq",
        config: {
          eyebrow: "Dúvidas",
          titulo: "Perguntas frequentes",
          itens: [
            { pergunta: "Crianças pagam ingresso?", resposta: "Crianças até 12 anos entram gratuitamente acompanhadas de um responsável." },
            { pergunta: "Tem estacionamento?", resposta: "Sim, estacionamento pago no local e nas proximidades. Recomendamos também transporte por aplicativo." },
            { pergunta: "Posso pedir reembolso?", resposta: "Sim, cancelamentos até 7 dias antes do evento têm reembolso integral." },
            { pergunta: "O evento acontece com chuva?", resposta: "Sim! As principais áreas são cobertas e o evento acontece em qualquer clima." },
          ],
        },
      },
      {
        tipo: "rodape",
        config: { texto: "Festival Cultural", contato: "contato@festivalcultural.com.br", instagram_url: "https://instagram.com" },
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* LANÇAMENTO DIGITAL                                                  */
  /* ------------------------------------------------------------------ */
  {
    id: "lancamento-digital",
    nome: "Lançamento Digital",
    categoria: "Marketing Digital",
    nicho: "curso",
    descricao: "Curso online, ebook, mentoria ou qualquer infoproduto digital.",
    icone: "🚀",
    tema: {
      fonte_titulo: "Montserrat",
      cores: {
        night: "#0d0d0f",
        night2: "#161618",
        night3: "#202023",
        cream: "#f5efe2",
        creamDim: "#b8b2a4",
        gold: "#e8b84b",
        coral: "#e8863a",
        green: "#4cae8a",
        pink: "#dd6f9c",
        violet: "#9a7fd0",
      },
    },
    blocos: [
      {
        tipo: "aviso",
        config: {
          texto: "⏳ Turma 12 fecha em breve — últimas vagas",
          link_texto: "Garantir vaga",
          href: "#oferta",
          cor: "gold",
        },
      },
      {
        tipo: "cabecalho",
        config: {
          nome: "Método Vendas Pro",
          botao: { texto: "Quero minha vaga", href: "#oferta", estilo: "primario", rastreio: "Cabecalho" },
        },
      },
      {
        tipo: "hero",
        config: {
          selo: "Método validado por +2.000 alunos",
          titulo: "Do Zero à Primeira Venda Online em 30 Dias",
          subtitulo: "O passo a passo completo para criar sua oferta, atrair clientes e vender todos os dias — mesmo começando sem audiência.",
          alinhamento: "centro",
          botoes: [
            { texto: "Quero começar agora", href: "#oferta", estilo: "primario", rastreio: "HeroPrincipal" },
            { texto: "Ver o que está incluso", href: "#conteudo", estilo: "secundario", rastreio: "HeroSecundario" },
          ],
        },
      },
      {
        tipo: "estatisticas",
        config: {
          itens: [
            { numero: "+2.000", rotulo: "alunos formados" },
            { numero: "4,9★", rotulo: "avaliação média" },
            { numero: "30 dias", rotulo: "para a primeira venda" },
          ],
        },
      },
      {
        tipo: "midiatexto",
        config: {
          eyebrow: "O problema",
          titulo: "Você não precisa de mais conteúdo. Precisa de um caminho.",
          corpo: "A internet está cheia de dicas soltas. O que falta é um método com começo, meio e fim — que diga exatamente o que fazer em cada dia. É isso que você recebe aqui.",
          posicao: "direita",
          itens: ["Sem precisar aparecer", "Sem investir alto em anúncios", "Começando do absoluto zero"],
        },
      },
      {
        tipo: "passos",
        config: {
          eyebrow: "O método",
          titulo: "3 fases até a primeira venda",
          itens: [
            { titulo: "Fundação", texto: "Escolha do nicho, construção da oferta e posicionamento nos primeiros 10 dias." },
            { titulo: "Audiência", texto: "Estratégia de conteúdo e captação dos primeiros 100 potenciais clientes." },
            { titulo: "Conversão", texto: "Scripts de venda prontos e funil simples para transformar seguidores em compradores." },
          ],
        },
      },
      {
        tipo: "lista",
        config: {
          eyebrow: "Tudo que está incluso",
          titulo: "Você recebe hoje",
          itens: [
            "8 módulos com aulas diretas ao ponto (sem enrolação)",
            "Acesso vitalício + todas as atualizações futuras",
            "Comunidade privada de alunos",
            "Mentoria em grupo ao vivo toda semana",
            "Templates, scripts e planilhas prontos para copiar",
            "Certificado de conclusão",
          ],
        },
      },
      {
        tipo: "depoimentos",
        config: {
          eyebrow: "Resultados reais",
          titulo: "Alunos que aplicaram e venderam",
          itens: [
            { texto: "Em 45 dias fiz minha primeira venda de R$497. Hoje faturo mais de R$8.000 por mês com o que aprendi.", autor: "Mariana S. • Rio de Janeiro" },
            { texto: "Estava desempregado e sem direção. Segui o método à risca e em 2 meses tinha um negócio funcionando.", autor: "Carlos M. • Belo Horizonte" },
            { texto: "O suporte da comunidade fez toda a diferença. Nunca me senti sozinha no processo.", autor: "Patrícia L. • Curitiba" },
          ],
        },
      },
      {
        tipo: "oferta",
        config: {
          eyebrow: "Oferta da turma 12",
          titulo: "Investimento único, retorno para sempre",
          preco: 497,
          preco_sufixo: "à vista • ou 12x de R$49,70",
          aviso: "O preço sobe na próxima turma.",
          botao: { texto: "Quero minha vaga agora", href: "#", estilo: "primario", rastreio: "Comprar" },
        },
      },
      {
        tipo: "garantia",
        config: {
          emoji: "🛡️",
          selo: "Garantia incondicional de 7 dias",
          titulo: "O risco é todo nosso",
          texto: "Entre, assista às aulas e participe da comunidade. Se em 7 dias você sentir que não é para você, devolvemos 100% do valor. Sem perguntas.",
        },
      },
      {
        tipo: "faq",
        config: {
          eyebrow: "Dúvidas",
          titulo: "Perguntas frequentes",
          itens: [
            { pergunta: "Preciso ter experiência prévia?", resposta: "Não. O método começa do absoluto zero e cada fase assume que você nunca vendeu online." },
            { pergunta: "Quanto tempo por dia preciso dedicar?", resposta: "Entre 30 minutos e 1 hora por dia é suficiente para seguir o cronograma de 30 dias." },
            { pergunta: "Por quanto tempo tenho acesso?", resposta: "Para sempre. Acesso vitalício com todas as atualizações incluídas." },
            { pergunta: "E se eu não gostar?", resposta: "Você tem 7 dias de garantia incondicional. Pediu, devolvemos — simples assim." },
          ],
        },
      },
      {
        tipo: "cta",
        config: {
          titulo: "Sua primeira venda está a 30 dias de distância",
          subtitulo: "Entre agora na turma 12 antes que as vagas acabem.",
          botao: { texto: "Garantir minha vaga", href: "#oferta", estilo: "primario", rastreio: "CTAFinal" },
        },
      },
      {
        tipo: "rodape",
        config: { texto: "Método Vendas Pro", contato: "suporte@vendaspro.com.br" },
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* SERVIÇO LOCAL                                                       */
  /* ------------------------------------------------------------------ */
  {
    id: "servico-local",
    nome: "Serviço Local",
    categoria: "Negócios Locais",
    nicho: "servico",
    descricao: "Salão, clínica, consultório, oficina ou qualquer serviço presencial.",
    icone: "🏪",
    tema: {
      fonte_titulo: "Fraunces",
      cores: {
        night: "#241018",
        night2: "#331722",
        night3: "#43202e",
        cream: "#fdf0ea",
        creamDim: "#dcc0bb",
        gold: "#f5b13a",
        coral: "#f06a9b",
        green: "#43b78c",
        pink: "#ea5c93",
        violet: "#b57ae0",
      },
    },
    blocos: [
      {
        tipo: "cabecalho",
        config: {
          nome: "Studio Beleza",
          botao: { texto: "Agendar horário", href: "#agendar", estilo: "primario", rastreio: "Cabecalho" },
        },
      },
      {
        tipo: "hero",
        config: {
          selo: "Há 10 anos cuidando de você",
          titulo: "Você Merece Sair Daqui se Sentindo Incrível",
          subtitulo: "Cabelo, unhas e estética com profissionais especializados, produtos de primeira linha e um ambiente pensado para o seu momento.",
          alinhamento: "centro",
          botoes: [
            { texto: "Agendar meu horário", href: "#agendar", estilo: "primario", rastreio: "HeroPrincipal" },
            { texto: "Conhecer os serviços", href: "#servicos", estilo: "secundario", rastreio: "HeroSecundario" },
          ],
        },
      },
      {
        tipo: "estatisticas",
        config: {
          itens: [
            { numero: "10 anos", rotulo: "de experiência" },
            { numero: "+5.000", rotulo: "clientes atendidas" },
            { numero: "4,9★", rotulo: "no Google" },
          ],
        },
      },
      {
        tipo: "cards",
        config: {
          eyebrow: "Nossos serviços",
          titulo: "Tudo em um só lugar",
          colunas: 3,
          itens: [
            { emoji: "✂️", titulo: "Cabelo", texto: "Corte, coloração, mechas, progressiva e tratamentos de reconstrução." },
            { emoji: "💅", titulo: "Unhas", texto: "Manicure, pedicure, alongamento em gel e nail art exclusiva." },
            { emoji: "✨", titulo: "Estética", texto: "Design de sobrancelha, depilação, limpeza de pele e cuidados faciais." },
          ],
        },
      },
      {
        tipo: "midiatexto",
        config: {
          eyebrow: "Por que somos diferentes",
          titulo: "Atendimento que começa no cuidado",
          corpo: "Aqui você não é mais uma na agenda. Cada atendimento começa com uma conversa para entender o que você quer — e termina só quando você ama o resultado.",
          posicao: "esquerda",
          itens: ["Profissionais com formação contínua", "Produtos de linha profissional", "Café e wi-fi enquanto você espera"],
        },
      },
      {
        tipo: "depoimentos",
        config: {
          eyebrow: "Quem vem, volta",
          titulo: "O que as clientes dizem",
          itens: [
            { texto: "Melhor salão que já fui na vida. A atenção aos detalhes é impressionante e o resultado sempre supera.", autor: "Juliana C. • cliente há 3 anos" },
            { texto: "Saio de lá me sentindo outra pessoa. Não troco por nada.", autor: "Ana Paula M. • cliente há 5 anos" },
            { texto: "Preço justo, ambiente lindo, profissionais de altíssimo nível. Recomendo de olhos fechados.", autor: "Fernanda T." },
          ],
        },
      },
      {
        tipo: "passos",
        config: {
          eyebrow: "Como funciona",
          titulo: "Agendar é simples",
          itens: [
            { titulo: "Você escolhe o serviço", texto: "Preencha o formulário contando o que deseja." },
            { titulo: "Confirmamos o horário", texto: "Retornamos pelo WhatsApp com as opções de agenda." },
            { titulo: "É só chegar", texto: "Deixa o resto com a gente — inclusive o cafezinho." },
          ],
        },
      },
      {
        tipo: "formulario",
        config: {
          eyebrow: "Agendamento",
          titulo: "Agende seu horário",
          subtitulo: "Respondemos em minutos no horário comercial.",
          campos: [
            { nome: "Nome completo", tipo: "texto", obrigatorio: true },
            { nome: "WhatsApp", tipo: "telefone", obrigatorio: true },
            { nome: "Serviço desejado", tipo: "texto", obrigatorio: false },
          ],
          botao_texto: "Quero agendar",
          mensagem_sucesso: "Recebemos seu pedido! Em breve confirmamos pelo WhatsApp. 💛",
        },
      },
      {
        tipo: "rodape",
        config: {
          texto: "Studio Beleza",
          contato: "Rua das Flores, 123 • (11) 99999-9999",
          instagram_url: "https://instagram.com",
        },
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* PORTFÓLIO PROFISSIONAL                                              */
  /* ------------------------------------------------------------------ */
  {
    id: "portfolio",
    nome: "Portfólio Profissional",
    categoria: "Profissional",
    nicho: "portfolio",
    descricao: "Fotógrafo, designer, nutricionista, advogado ou profissional liberal.",
    icone: "👤",
    tema: {
      cores: {
        night: "#101014",
        night2: "#18181e",
        night3: "#22222a",
        cream: "#f4f4f6",
        creamDim: "#a9a9b4",
        gold: "#9d8bf0",
        coral: "#7c5cff",
        green: "#4cc38a",
        pink: "#e878a6",
        violet: "#9d6be0",
      },
    },
    blocos: [
      {
        tipo: "cabecalho",
        config: {
          nome: "João Ávila — Design",
          botao: { texto: "Pedir orçamento", href: "#orcamento", estilo: "primario", rastreio: "Cabecalho" },
        },
      },
      {
        tipo: "hero",
        config: {
          selo: "+200 projetos entregues",
          titulo: "Design que Faz sua Marca ser Lembrada",
          subtitulo: "Identidade visual e materiais que comunicam com clareza, vendem mais e destacam sua empresa da concorrência.",
          alinhamento: "esquerda",
          botoes: [
            { texto: "Ver portfólio", href: "#portfolio", estilo: "primario", rastreio: "HeroPrincipal" },
            { texto: "Falar comigo", href: "#orcamento", estilo: "secundario", rastreio: "HeroSecundario" },
          ],
        },
      },
      {
        tipo: "midiatexto",
        config: {
          eyebrow: "Sobre",
          titulo: "Prazer, João",
          corpo: "Designer há 8 anos, especializado em identidade visual e branding. Já ajudei mais de 200 negócios — do food truck à startup — a construir marcas que os clientes reconhecem e confiam.",
          posicao: "esquerda",
          itens: ["Formado pela ESPM", "Especialista em branding", "Atendo todo o Brasil (remoto)"],
        },
      },
      {
        tipo: "cards",
        config: {
          eyebrow: "Serviços",
          titulo: "Como posso ajudar",
          colunas: 3,
          itens: [
            { emoji: "🎨", titulo: "Identidade Visual", texto: "Logo, paleta, tipografia e manual de marca completo para lançar ou reposicionar." },
            { emoji: "📱", titulo: "Social Media", texto: "Templates e artes profissionais para suas redes venderem por você." },
            { emoji: "📄", titulo: "Materiais", texto: "Cartão, catálogo, embalagem, sinalização — tudo que sua marca tocar." },
          ],
        },
      },
      {
        tipo: "galeria",
        config: {
          eyebrow: "Portfólio",
          titulo: "Projetos recentes",
          imagens: [],
        },
      },
      {
        tipo: "estatisticas",
        config: {
          itens: [
            { numero: "+200", rotulo: "projetos entregues" },
            { numero: "8 anos", rotulo: "de mercado" },
            { numero: "98%", rotulo: "de clientes satisfeitos" },
          ],
        },
      },
      {
        tipo: "depoimentos",
        config: {
          eyebrow: "Clientes",
          titulo: "O que dizem do meu trabalho",
          itens: [
            { texto: "O João transformou nossa identidade. Hoje recebemos elogios pela marca toda semana — e mais clientes também.", autor: "Marina R. • CEO da Boutique Flor" },
            { texto: "Entregou antes do prazo, com qualidade absurda e um processo super organizado. Recomendo sempre.", autor: "Pedro A. • Diretor de Marketing" },
          ],
        },
      },
      {
        tipo: "passos",
        config: {
          eyebrow: "Processo",
          titulo: "Como trabalhamos juntos",
          itens: [
            { titulo: "Briefing", texto: "Uma conversa para entender seu negócio, público e objetivos." },
            { titulo: "Criação", texto: "Desenvolvimento com apresentação de conceitos e rodadas de ajuste." },
            { titulo: "Entrega", texto: "Arquivos finais organizados + manual de uso da sua marca." },
          ],
        },
      },
      {
        tipo: "formulario",
        config: {
          eyebrow: "Orçamento",
          titulo: "Vamos criar algo juntos?",
          subtitulo: "Conte sobre seu projeto e retorno em até 1 dia útil.",
          campos: [
            { nome: "Seu nome", tipo: "texto", obrigatorio: true },
            { nome: "Email", tipo: "email", obrigatorio: true },
            { nome: "Sobre o projeto", tipo: "texto", obrigatorio: false },
          ],
          botao_texto: "Solicitar orçamento",
          mensagem_sucesso: "Recebido! Retorno em até 1 dia útil. 🚀",
        },
      },
      {
        tipo: "rodape",
        config: {
          texto: "João Ávila — Design",
          contato: "joao@avila.design",
          instagram_url: "https://instagram.com",
        },
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* RESTAURANTE                                                         */
  /* ------------------------------------------------------------------ */
  {
    id: "restaurante",
    nome: "Restaurante / Delivery",
    categoria: "Gastronomia",
    nicho: "restaurante",
    descricao: "Restaurante, lanchonete, café, delivery ou negócio gastronômico.",
    icone: "🍽️",
    tema: {
      fonte_titulo: "Fraunces",
      cores: {
        night: "#171209",
        night2: "#231b0e",
        night3: "#2f2513",
        cream: "#f7efdd",
        creamDim: "#cfc2a4",
        gold: "#e7b64b",
        coral: "#e05e3d",
        green: "#7fa653",
        pink: "#d98a63",
        violet: "#b08c5e",
      },
    },
    blocos: [
      {
        tipo: "aviso",
        config: {
          texto: "🛵 Delivery grátis no bairro em pedidos acima de R$60",
          link_texto: "Pedir agora",
          href: "#pedido",
          cor: "green",
        },
      },
      {
        tipo: "cabecalho",
        config: {
          nome: "Casa do Sabor",
          botao: { texto: "Reservar mesa", href: "#reserva", estilo: "primario", rastreio: "Cabecalho" },
        },
      },
      {
        tipo: "hero",
        config: {
          selo: "Cozinha afetiva desde 2012",
          titulo: "Comida de Verdade, Feita como Antigamente",
          subtitulo: "Ingredientes frescos do produtor local, receitas de família e aquele tempero que abraça. Venha almoçar ou peça em casa.",
          alinhamento: "centro",
          botoes: [
            { texto: "Ver cardápio", href: "#cardapio", estilo: "primario", rastreio: "HeroPrincipal" },
            { texto: "Reservar mesa", href: "#reserva", estilo: "secundario", rastreio: "HeroSecundario" },
          ],
        },
      },
      {
        tipo: "cards",
        config: {
          eyebrow: "Cardápio",
          titulo: "As estrelas da casa",
          colunas: 3,
          itens: [
            { emoji: "🍖", titulo: "Costela 12 horas", texto: "Assada lentamente até desmanchar, com mandioca na manteiga e farofa crocante." },
            { emoji: "🍤", titulo: "Moqueca de Camarão", texto: "Camarões graúdos no leite de coco com dendê, arroz e pirão." },
            { emoji: "🍮", titulo: "Pudim da Vó", texto: "A receita original de 1987 — cremoso, com calda de caramelo de verdade." },
          ],
        },
      },
      {
        tipo: "midiatexto",
        config: {
          eyebrow: "Nossa história",
          titulo: "Três gerações na mesma cozinha",
          corpo: "O que começou como um fogão a lenha no quintal virou o restaurante preferido do bairro. As receitas continuam as mesmas — o carinho também.",
          posicao: "direita",
          itens: ["Ingredientes do produtor local", "Opções vegetarianas todo dia", "Espaço kids no salão"],
        },
      },
      {
        tipo: "galeria",
        config: {
          eyebrow: "Ambiente",
          titulo: "Um lugar para ficar à vontade",
          imagens: [],
        },
      },
      {
        tipo: "depoimentos",
        config: {
          eyebrow: "Avaliações",
          titulo: "Quem provou, aprovou",
          itens: [
            { texto: "A costela desmancha na boca. Almoço aqui toda semana e nunca decepciona.", autor: "Marcos V. ⭐⭐⭐⭐⭐" },
            { texto: "Comida caseira de verdade, atendimento carinhoso e preço honesto. Virou tradição de domingo.", autor: "Família Oliveira ⭐⭐⭐⭐⭐" },
          ],
        },
      },
      {
        tipo: "texto",
        config: {
          eyebrow: "Onde estamos",
          titulo: "Rua das Palmeiras, 456 — Centro",
          corpo: "Terça a domingo • Almoço 11h30–15h • Jantar 18h–22h30. Delivery pelo WhatsApp ou iFood. Aceitamos reservas para grupos.",
          alinhamento: "centro",
        },
      },
      {
        tipo: "formulario",
        config: {
          eyebrow: "Reservas",
          titulo: "Reserve sua mesa",
          subtitulo: "Confirmamos em até 2 horas pelo WhatsApp.",
          campos: [
            { nome: "Nome", tipo: "texto", obrigatorio: true },
            { nome: "WhatsApp", tipo: "telefone", obrigatorio: true },
            { nome: "Data, horário e nº de pessoas", tipo: "texto", obrigatorio: true },
          ],
          botao_texto: "Fazer reserva",
          mensagem_sucesso: "Reserva recebida! Confirmamos em breve pelo WhatsApp. 🍽️",
        },
      },
      {
        tipo: "rodape",
        config: {
          texto: "Casa do Sabor",
          contato: "Rua das Palmeiras, 456 • (11) 98888-7777",
          instagram_url: "https://instagram.com",
        },
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* IMOBILIÁRIA                                                         */
  /* ------------------------------------------------------------------ */
  {
    id: "imobiliaria",
    nome: "Imobiliária / Corretor",
    categoria: "Imóveis",
    nicho: "imovel",
    descricao: "Imobiliária ou corretor de compra, venda e aluguel.",
    icone: "🏠",
    tema: {
      fonte_titulo: "Montserrat",
      cores: {
        night: "#0b1b2e",
        night2: "#12263f",
        night3: "#1b3350",
        cream: "#f2f6fb",
        creamDim: "#b9c8da",
        gold: "#f6c453",
        coral: "#3f8cff",
        green: "#3fb9a6",
        pink: "#e878a6",
        violet: "#7aa2e3",
      },
    },
    blocos: [
      {
        tipo: "cabecalho",
        config: {
          nome: "Prime Imóveis",
          botao: { texto: "Falar com corretor", href: "#atendimento", estilo: "primario", rastreio: "Cabecalho" },
        },
      },
      {
        tipo: "hero",
        config: {
          selo: "CRECI 123456 • 15 anos de mercado",
          titulo: "O Imóvel Certo, Sem Dor de Cabeça",
          subtitulo: "Da primeira visita à assinatura do contrato: cuidamos da documentação, negociação e financiamento para você só se preocupar com a mudança.",
          alinhamento: "centro",
          botoes: [
            { texto: "Quero ser atendido", href: "#atendimento", estilo: "primario", rastreio: "HeroPrincipal" },
            { texto: "Como funciona", href: "#processo", estilo: "secundario", rastreio: "HeroSecundario" },
          ],
        },
      },
      {
        tipo: "estatisticas",
        config: {
          itens: [
            { numero: "+500", rotulo: "imóveis na carteira" },
            { numero: "15 anos", rotulo: "de mercado" },
            { numero: "+1.200", rotulo: "famílias atendidas" },
            { numero: "30 dias", rotulo: "tempo médio de fechamento" },
          ],
        },
      },
      {
        tipo: "cards",
        config: {
          eyebrow: "O que buscamos para você",
          titulo: "Todos os tipos de imóvel",
          colunas: 3,
          itens: [
            { emoji: "🏢", titulo: "Apartamentos", texto: "Do studio compacto à cobertura, nos bairros mais valorizados." },
            { emoji: "🏡", titulo: "Casas", texto: "Térreas, sobrados e condomínios fechados para todos os momentos de vida." },
            { emoji: "🏬", titulo: "Comercial", texto: "Salas, lojas e galpões para sua empresa crescer no endereço certo." },
          ],
        },
      },
      {
        tipo: "passos",
        config: {
          eyebrow: "Como funciona",
          titulo: "Do primeiro contato às chaves",
          itens: [
            { titulo: "Entenda o que você busca", texto: "Uma conversa para mapear orçamento, região e prioridades." },
            { titulo: "Seleção personalizada", texto: "Você recebe só imóveis que fazem sentido — sem spam de anúncios." },
            { titulo: "Visitas acompanhadas", texto: "Agendamos e acompanhamos cada visita com olhar técnico." },
            { titulo: "Fechamento seguro", texto: "Documentação, financiamento e contrato revisados por especialistas." },
          ],
        },
      },
      {
        tipo: "depoimentos",
        config: {
          eyebrow: "Clientes",
          titulo: "Quem já recebeu as chaves",
          itens: [
            { texto: "Compramos nosso primeiro apartamento em 28 dias, com financiamento aprovado nas melhores condições. Equipe impecável.", autor: "Rodrigo & Lívia F." },
            { texto: "Processo 100% transparente. Me explicaram cada etapa e negociaram um desconto que eu não conseguiria sozinha.", autor: "Luciana P." },
          ],
        },
      },
      {
        tipo: "garantia",
        config: {
          emoji: "🤝",
          selo: "Compromisso Prime",
          titulo: "Assessoria completa sem custo extra",
          texto: "Análise de documentação, apoio no financiamento e acompanhamento jurídico já inclusos. Você não paga nada além da negociação.",
        },
      },
      {
        tipo: "formulario",
        config: {
          eyebrow: "Atendimento",
          titulo: "Fale com um corretor agora",
          subtitulo: "Conte o que procura e retornamos ainda hoje.",
          campos: [
            { nome: "Nome", tipo: "texto", obrigatorio: true },
            { nome: "WhatsApp", tipo: "telefone", obrigatorio: true },
            { nome: "O que procura? (compra, aluguel, região...)", tipo: "texto", obrigatorio: false },
          ],
          botao_texto: "Quero atendimento",
          mensagem_sucesso: "Perfeito! Um corretor entrará em contato ainda hoje. 🏠",
        },
      },
      {
        tipo: "rodape",
        config: {
          texto: "Prime Imóveis",
          contato: "contato@primeimoveis.com.br • CRECI 123456",
        },
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* CAPTURA DE LEADS                                                    */
  /* ------------------------------------------------------------------ */
  {
    id: "captura-leads",
    nome: "Captura de Leads",
    categoria: "Marketing Digital",
    nicho: "leads",
    descricao: "Isca digital, ebook gratuito, mini-curso ou lista de espera.",
    icone: "📧",
    tema: {
      cores: {
        night: "#0e2018",
        night2: "#143026",
        night3: "#1d4234",
        cream: "#f3f7ee",
        creamDim: "#c0d2ba",
        gold: "#e7b64b",
        coral: "#4cc38a",
        green: "#4cc38a",
        pink: "#e58fb0",
        violet: "#9a86d8",
      },
    },
    blocos: [
      {
        tipo: "cabecalho",
        config: { nome: "Guia do Empreendedor" },
      },
      {
        tipo: "hero",
        config: {
          selo: "Download gratuito • Leitura de 20 minutos",
          titulo: "O Guia Prático para Dobrar suas Vendas em 60 Dias",
          subtitulo: "O mesmo passo a passo que mais de 5.000 empreendedores usaram para destravar o crescimento — direto na sua caixa de entrada.",
          alinhamento: "centro",
          botoes: [
            { texto: "Baixar o guia grátis", href: "#captura", estilo: "primario", rastreio: "HeroPrincipal" },
          ],
        },
      },
      {
        tipo: "lista",
        config: {
          eyebrow: "Dentro do guia",
          titulo: "O que você vai destravar",
          itens: [
            "Como identificar o cliente que realmente compra de você",
            "As 5 estratégias de venda que mais convertem hoje",
            "O jeito certo de montar uma oferta irresistível",
            "Um funil simples que qualquer negócio aplica em 1 semana",
            "Ferramentas gratuitas para automatizar o processo",
          ],
        },
      },
      {
        tipo: "estatisticas",
        config: {
          itens: [
            { numero: "+5.000", rotulo: "downloads" },
            { numero: "20 min", rotulo: "de leitura direta" },
            { numero: "100%", rotulo: "gratuito" },
          ],
        },
      },
      {
        tipo: "depoimentos",
        config: {
          eyebrow: "Quem já leu",
          titulo: "Resultados de quem aplicou",
          itens: [
            { texto: "Apliquei só o capítulo 3 e em três semanas as vendas subiram 40%. Material absurdamente prático.", autor: "Bruna A. • loja de semijoias" },
            { texto: "Direto ao ponto, sem enrolação. Salvou meu planejamento do trimestre.", autor: "Rafael N. • agência de marketing" },
          ],
        },
      },
      {
        tipo: "formulario",
        config: {
          eyebrow: "Acesso imediato",
          titulo: "Receba o guia agora",
          subtitulo: "Preencha e o material chega no seu email em 1 minuto.",
          campos: [
            { nome: "Nome", tipo: "texto", obrigatorio: true },
            { nome: "Melhor email", tipo: "email", obrigatorio: true },
          ],
          botao_texto: "Quero o guia gratuito",
          mensagem_sucesso: "Feito! Confira seu email — o guia já está chegando. 📬",
        },
      },
      {
        tipo: "rodape",
        config: {
          texto: "Guia do Empreendedor",
          contato: "contato@guiadoempreendedor.com.br",
        },
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* PRODUTO FÍSICO                                                      */
  /* ------------------------------------------------------------------ */
  {
    id: "produto-fisico",
    nome: "Produto Físico",
    categoria: "E-commerce",
    nicho: "produto",
    descricao: "Loja online, artesanato, suplementos, cosméticos ou produto físico.",
    icone: "📦",
    tema: {
      fonte_titulo: "Fraunces",
      cores: {
        night: "#101a12",
        night2: "#17251a",
        night3: "#203323",
        cream: "#f4f7ee",
        creamDim: "#c3d0bd",
        gold: "#d9a441",
        coral: "#4cae62",
        green: "#4cc38a",
        pink: "#dd8fb0",
        violet: "#8fa86b",
      },
    },
    blocos: [
      {
        tipo: "aviso",
        config: {
          texto: "🚚 Frete grátis para todo o Brasil acima de R$99",
          cor: "green",
        },
      },
      {
        tipo: "cabecalho",
        config: {
          nome: "Verde Natural",
          botao: { texto: "Comprar agora", href: "#oferta", estilo: "primario", rastreio: "Cabecalho" },
        },
      },
      {
        tipo: "hero",
        config: {
          selo: "Vegano • Cruelty-free • Dermatologicamente testado",
          titulo: "Sua Pele Merece o que a Natureza Tem de Melhor",
          subtitulo: "Cosméticos naturais sem parabenos, sem sulfatos e sem crueldade. Resultados visíveis em 30 dias ou seu dinheiro de volta.",
          alinhamento: "centro",
          botoes: [
            { texto: "Quero experimentar", href: "#oferta", estilo: "primario", rastreio: "HeroPrincipal" },
            { texto: "Por que funciona", href: "#beneficios", estilo: "secundario", rastreio: "HeroSecundario" },
          ],
        },
      },
      {
        tipo: "estatisticas",
        config: {
          itens: [
            { numero: "+30.000", rotulo: "clientes atendidas" },
            { numero: "96%", rotulo: "recomendam o kit" },
            { numero: "4,8★", rotulo: "média de avaliação" },
          ],
        },
      },
      {
        tipo: "midiatexto",
        config: {
          eyebrow: "O diferencial",
          titulo: "Fórmula limpa, resultado real",
          corpo: "Cada produto combina ativos botânicos concentrados com tecnologia dermatológica. Nada de promessa vazia: são fórmulas testadas, aprovadas pela ANVISA e amadas por milhares de clientes.",
          posicao: "esquerda",
          itens: ["Sem parabenos e sem sulfatos", "Embalagens recicláveis", "Testado dermatologicamente"],
        },
      },
      {
        tipo: "galeria",
        config: {
          eyebrow: "A linha",
          titulo: "Conheça os produtos",
          imagens: [],
        },
      },
      {
        tipo: "depoimentos",
        config: {
          eyebrow: "Avaliações verificadas",
          titulo: "Quem usa, ama",
          itens: [
            { texto: "Uso há 3 meses e minha pele nunca esteve tão bem. Textura maravilhosa e o cheiro é um spa.", autor: "Camila R. ⭐⭐⭐⭐⭐" },
            { texto: "Finalmente um hidratante que funciona sem pesar. Já estou no terceiro pote.", autor: "Isabela F. ⭐⭐⭐⭐⭐" },
            { texto: "Comprei desconfiada e virei cliente fiel. A diferença apareceu em 2 semanas.", autor: "Renata L. ⭐⭐⭐⭐⭐" },
          ],
        },
      },
      {
        tipo: "oferta",
        config: {
          eyebrow: "Kit mais vendido",
          titulo: "Kit Rotina Completa",
          preco: 189,
          preco_sufixo: "à vista • frete grátis",
          aviso: "Estoque limitado do lote atual.",
          botao: { texto: "Quero o meu kit", href: "#", estilo: "primario", rastreio: "Comprar" },
        },
      },
      {
        tipo: "garantia",
        config: {
          emoji: "💚",
          selo: "Garantia de 30 dias",
          titulo: "Amou ou devolvemos",
          texto: "Use por 30 dias. Se não amar o resultado, devolvemos 100% do valor — e o frete da devolução é por nossa conta.",
        },
      },
      {
        tipo: "faq",
        config: {
          eyebrow: "Dúvidas",
          titulo: "Perguntas frequentes",
          itens: [
            { pergunta: "Qual o prazo de entrega?", resposta: "Até 5 dias úteis para todo o Brasil. Sul e Sudeste costumam receber em 2-3 dias." },
            { pergunta: "Serve para pele sensível?", resposta: "Sim. As fórmulas são hipoalergênicas e dermatologicamente testadas, incluindo peles sensíveis." },
            { pergunta: "Como funciona a garantia?", resposta: "Você tem 30 dias para testar. Não amou? Chama no WhatsApp e devolvemos tudo." },
          ],
        },
      },
      {
        tipo: "rodape",
        config: {
          texto: "Verde Natural",
          contato: "sac@verdenatural.com.br",
          instagram_url: "https://instagram.com",
        },
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* LINK-IN-BIO                                                         */
  /* ------------------------------------------------------------------ */
  {
    id: "link-in-bio",
    nome: "Link-in-Bio",
    categoria: "Redes Sociais",
    nicho: "bio",
    descricao: "Página com seus principais links para o Instagram ou TikTok.",
    icone: "🔗",
    tema: {
      fonte_titulo: "Bebas Neue",
      cores: {
        night: "#150c2e",
        night2: "#1f1242",
        night3: "#2a1a56",
        cream: "#f6f2ff",
        creamDim: "#c9bce6",
        gold: "#ffb84d",
        coral: "#ff5c8a",
        green: "#3fd0a4",
        pink: "#ff5c8a",
        violet: "#9d6be0",
      },
    },
    blocos: [
      {
        tipo: "hero",
        config: {
          selo: "✨ Novo vídeo toda terça",
          titulo: "@seuperfil",
          subtitulo: "Criadora de conteúdo • Lifestyle, viagens e bem-estar para viver mais leve",
          alinhamento: "centro",
          botoes: [
            { texto: "📸 Instagram", href: "https://instagram.com", estilo: "primario", rastreio: "LinkInstagram" },
            { texto: "🎥 YouTube", href: "https://youtube.com", estilo: "secundario", rastreio: "LinkYouTube" },
            { texto: "🎵 TikTok", href: "https://tiktok.com", estilo: "secundario", rastreio: "LinkTikTok" },
          ],
        },
      },
      {
        tipo: "cards",
        config: {
          eyebrow: "Em destaque",
          titulo: "Meus queridinhos",
          colunas: 2,
          itens: [
            { emoji: "📚", titulo: "Ebook de Viagens", texto: "Roteiros prontos pelo Brasil gastando pouco. Download gratuito." },
            { emoji: "🛍️", titulo: "Minha lojinha", texto: "Os produtos que eu uso e recomendo de verdade, com cupom." },
            { emoji: "🎙️", titulo: "Podcast", texto: "Conversas sinceras sobre carreira criativa, toda quinta." },
            { emoji: "🤝", titulo: "Parcerias", texto: "Trabalhe comigo: mídia kit e contato comercial." },
          ],
        },
      },
      {
        tipo: "formulario",
        config: {
          eyebrow: "Newsletter",
          titulo: "Recebe minhas novidades?",
          subtitulo: "Uma vez por semana, sem spam. Prometo. 💌",
          campos: [
            { nome: "Nome", tipo: "texto", obrigatorio: true },
            { nome: "Email", tipo: "email", obrigatorio: true },
          ],
          botao_texto: "Entrar na lista",
          mensagem_sucesso: "Boa! Você está na lista. 🎉",
        },
      },
      {
        tipo: "rodape",
        config: {
          texto: "@seuperfil",
          instagram_url: "https://instagram.com",
        },
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* WEBINAR / VSL                                                       */
  /* ------------------------------------------------------------------ */
  {
    id: "webinar-vsl",
    nome: "Webinar / VSL",
    categoria: "Marketing Digital",
    nicho: "webinar",
    descricao: "Webinar ao vivo, aula gravada ou vídeo de vendas com oferta.",
    icone: "📹",
    tema: {
      fonte_titulo: "Oswald",
      cores: {
        night: "#0a1420",
        night2: "#101f30",
        night3: "#172b42",
        cream: "#eef4fb",
        creamDim: "#b3c4d8",
        gold: "#f6c453",
        coral: "#ff6b5e",
        green: "#3fb9a6",
        pink: "#e878a6",
        violet: "#7aa2e3",
      },
    },
    blocos: [
      {
        tipo: "aviso",
        config: {
          texto: "🔴 Aula ao vivo quinta-feira às 20h — vagas limitadas",
          link_texto: "Inscrever-se",
          href: "#inscricao",
          cor: "coral",
        },
      },
      {
        tipo: "cabecalho",
        config: {
          nome: "Masterclass Tráfego",
          botao: { texto: "Garantir vaga grátis", href: "#inscricao", estilo: "primario", rastreio: "Cabecalho" },
        },
      },
      {
        tipo: "hero",
        config: {
          selo: "Masterclass gratuita e ao vivo",
          titulo: "Como Triplicar suas Vendas com Tráfego Pago em 90 Dias",
          subtitulo: "Mesmo que você já tenha tentado e queimado dinheiro em anúncio. Método apresentado ao vivo, com sessão de perguntas no final.",
          alinhamento: "centro",
          botoes: [
            { texto: "Quero minha vaga gratuita", href: "#inscricao", estilo: "primario", rastreio: "HeroPrincipal" },
          ],
        },
      },
      {
        tipo: "video",
        config: {
          titulo: "Assista ao convite (2 min)",
          video_url: "",
        },
      },
      {
        tipo: "lista",
        config: {
          eyebrow: "Na aula você vai descobrir",
          titulo: "O que vamos ver juntos",
          itens: [
            "O erro nº 1 que faz 90% das campanhas queimarem dinheiro",
            "A estrutura de anúncio que converte mesmo com R$10/dia",
            "Como escolher o público certo (e parar de atirar no escuro)",
            "O retargeting que recupera quem quase comprou",
            "Case real: de R$3 mil para R$47 mil em vendas em 3 meses",
          ],
        },
      },
      {
        tipo: "midiatexto",
        config: {
          eyebrow: "Seu instrutor",
          titulo: "Quem vai te ensinar",
          corpo: "Especialista em tráfego pago com 8 anos de estrada e mais de R$10 milhões gerenciados em anúncios. Já ajudou +300 empresas a escalar com Meta Ads e Google Ads.",
          posicao: "esquerda",
          itens: ["+R$10 milhões gerenciados", "+300 empresas atendidas", "Certificado Meta e Google"],
        },
      },
      {
        tipo: "estatisticas",
        config: {
          itens: [
            { numero: "+15.000", rotulo: "alunos nas masterclasses" },
            { numero: "97%", rotulo: "avaliam como excelente" },
            { numero: "90 min", rotulo: "de conteúdo prático" },
          ],
        },
      },
      {
        tipo: "formulario",
        config: {
          eyebrow: "Inscrição gratuita",
          titulo: "Reserve seu lugar agora",
          subtitulo: "Você recebe o link da aula por email e WhatsApp.",
          campos: [
            { nome: "Nome completo", tipo: "texto", obrigatorio: true },
            { nome: "Melhor email", tipo: "email", obrigatorio: true },
            { nome: "WhatsApp", tipo: "telefone", obrigatorio: false },
          ],
          botao_texto: "Garantir minha vaga gratuita",
          mensagem_sucesso: "Inscrição confirmada! Confira seu email. 🎉",
        },
      },
      {
        tipo: "faq",
        config: {
          eyebrow: "Dúvidas",
          titulo: "Perguntas frequentes",
          itens: [
            { pergunta: "A aula é mesmo gratuita?", resposta: "Sim, 100% gratuita. Não pedimos cartão em nenhum momento." },
            { pergunta: "Não posso ao vivo. E agora?", resposta: "Inscritos recebem a gravação por 48 horas após o evento." },
            { pergunta: "Serve para quem está começando?", resposta: "Sim. O método é apresentado do zero, com exemplos práticos para iniciantes e avançados." },
          ],
        },
      },
      {
        tipo: "rodape",
        config: {
          texto: "Masterclass Tráfego",
          contato: "suporte@masterclass.com.br",
        },
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* INFOPRODUTO LOW-TICKET (R$27–97, compra por impulso)                */
  /* Copy: PAS + urgência + ancoragem de preço + garantia                */
  /* ------------------------------------------------------------------ */
  {
    id: "infoproduto-lowticket",
    nome: "Infoproduto Low-Ticket",
    categoria: "Infoprodutos",
    nicho: "lowticket",
    descricao: "Ebook, planilha, mini-curso de R$27 a R$97. Página curta e direta para compra por impulso.",
    icone: "⚡",
    tema: {
      fonte_titulo: "Archivo Black",
      cores: {
        night: "#1a0e08",
        night2: "#28160d",
        night3: "#372013",
        cream: "#fdf3e7",
        creamDim: "#d9bfa8",
        gold: "#ffb347",
        coral: "#ff6b35",
        green: "#4cc38a",
        pink: "#ff8c5a",
        violet: "#d98a63",
      },
    },
    blocos: [
      {
        tipo: "aviso",
        config: {
          texto: "⚡ OFERTA RELÂMPAGO: de R$97 por R$27 — só hoje",
          link_texto: "Aproveitar",
          href: "#oferta",
          cor: "coral",
        },
      },
      {
        tipo: "cabecalho",
        config: {
          nome: "Planner Vende Mais",
          botao: { texto: "Quero por R$27", href: "#oferta", estilo: "primario", rastreio: "Cabecalho" },
        },
      },
      {
        tipo: "hero",
        config: {
          selo: "+3.700 vendidos • Acesso imediato",
          titulo: "Organize Suas Vendas da Semana em 15 Minutos por Dia",
          subtitulo: "O planner digital que faz você parar de perder venda por desorganização — pelo preço de uma pizza.",
          alinhamento: "centro",
          botoes: [
            { texto: "Quero meu acesso por R$27", href: "#oferta", estilo: "primario", rastreio: "HeroPrincipal" },
          ],
        },
      },
      {
        tipo: "midiatexto",
        config: {
          eyebrow: "Você se identifica?",
          titulo: "Cliente esquecido = venda perdida",
          corpo: "Você responde no WhatsApp, anota no caderno, esquece de dar retorno… e quando lembra, o cliente já comprou de outro. Não é falta de esforço — é falta de sistema. E cada semana desorganizada custa dinheiro real.",
          posicao: "direita",
          itens: ["Follow-ups esquecidos", "Clientes espalhados em mil lugares", "Nenhuma previsão do mês"],
        },
      },
      {
        tipo: "lista",
        config: {
          eyebrow: "O que você recebe hoje",
          titulo: "Tudo isso por menos de R$1 por dia no mês",
          itens: [
            "Planner digital completo (Notion + PDF imprimível)",
            "Sistema de follow-up que lembra você de cada cliente",
            "Painel de metas com previsão de faturamento do mês",
            "BÔNUS 1: 30 mensagens prontas de follow-up (vale R$47)",
            "BÔNUS 2: Aula de 20 min — como fechar no WhatsApp (vale R$67)",
            "Atualizações gratuitas para sempre",
          ],
        },
      },
      {
        tipo: "estatisticas",
        config: {
          itens: [
            { numero: "+3.700", rotulo: "clientes usando" },
            { numero: "4,9★", rotulo: "avaliação média" },
            { numero: "15 min", rotulo: "por dia é o suficiente" },
          ],
        },
      },
      {
        tipo: "depoimentos",
        config: {
          eyebrow: "Prova real",
          titulo: "Quem comprou por impulso e não se arrependeu",
          itens: [
            { texto: "Paguei R$27 achando que era mais um PDF qualquer. Recuperei o valor na primeira venda que teria esquecido de fazer o follow-up.", autor: "Vanessa R. • consultora de vendas" },
            { texto: "Simples do jeito certo. Em uma semana minha rotina virou outra.", autor: "Thiago M. • autônomo" },
          ],
        },
      },
      {
        tipo: "oferta",
        config: {
          eyebrow: "Oferta relâmpago",
          titulo: "De R$97 por apenas:",
          preco: 27,
          preco_sufixo: "pagamento único • acesso imediato",
          aviso: "🔒 Compra segura • Acesso enviado por email em 1 minuto",
          botao: { texto: "QUERO MEU ACESSO AGORA", href: "#", estilo: "primario", rastreio: "Comprar" },
        },
      },
      {
        tipo: "garantia",
        config: {
          emoji: "🛡️",
          selo: "Garantia de 7 dias",
          titulo: "Risco zero, de verdade",
          texto: "Baixe, use e teste por 7 dias. Se não valer 10x o que pagou, é só mandar um email e devolvemos os R$27. Sem perguntas.",
        },
      },
      {
        tipo: "faq",
        config: {
          eyebrow: "Últimas dúvidas",
          titulo: "Perguntas rápidas",
          itens: [
            { pergunta: "Como recebo o acesso?", resposta: "Imediatamente após o pagamento, direto no seu email. Pix ou cartão." },
            { pergunta: "Funciona no celular?", resposta: "Sim! Notion e PDF funcionam em qualquer aparelho." },
            { pergunta: "É pagamento único mesmo?", resposta: "Sim. R$27 uma única vez, sem mensalidade, com atualizações grátis." },
          ],
        },
      },
      {
        tipo: "cta",
        config: {
          titulo: "R$27. Uma decisão de 10 segundos.",
          subtitulo: "Amanhã volta para R$97 — e a desorganização continua custando caro.",
          botao: { texto: "Garantir por R$27 agora", href: "#oferta", estilo: "primario", rastreio: "CTAFinal" },
        },
      },
      {
        tipo: "rodape",
        config: { texto: "Planner Vende Mais", contato: "suporte@vendemais.com.br" },
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* PÁGINA DE VENDAS HIGH-TICKET (curso completo / método R$997+)       */
  /* Copy: AIDA longa + mecanismo único + stack de bônus + ancoragem     */
  /* ------------------------------------------------------------------ */
  {
    id: "pagina-vendas",
    nome: "Página de Vendas (High-Ticket)",
    categoria: "Infoprodutos",
    nicho: "vendas",
    descricao: "Página longa de venda para curso ou método premium (R$497+), com mecanismo, bônus e ancoragem.",
    icone: "💰",
    tema: {
      fonte_titulo: "Montserrat",
      cores: {
        night: "#0a0f1c",
        night2: "#101828",
        night3: "#182338",
        cream: "#f2f5fa",
        creamDim: "#aebbd0",
        gold: "#e8b84b",
        coral: "#e8b84b",
        green: "#4cc38a",
        pink: "#dd6f9c",
        violet: "#7aa2e3",
      },
    },
    blocos: [
      {
        tipo: "aviso",
        config: {
          texto: "🎓 Turma com bônus de mentoria fecha domingo às 23h59",
          link_texto: "Ver oferta",
          href: "#oferta",
          cor: "gold",
        },
      },
      {
        tipo: "cabecalho",
        config: {
          nome: "Máquina de Clientes",
          botao: { texto: "Entrar para a turma", href: "#oferta", estilo: "primario", rastreio: "Cabecalho" },
        },
      },
      {
        tipo: "hero",
        config: {
          selo: "Para prestadores de serviço que já faturam e querem escalar",
          titulo: "Tenha uma Agenda Cheia de Clientes Certos — Sem Depender de Indicação",
          subtitulo: "O método completo para construir um sistema previsível de captação que gera de 10 a 30 oportunidades qualificadas por mês.",
          alinhamento: "centro",
          botoes: [
            { texto: "Quero minha agenda cheia", href: "#oferta", estilo: "primario", rastreio: "HeroPrincipal" },
            { texto: "Ver o método completo", href: "#metodo", estilo: "secundario", rastreio: "HeroSecundario" },
          ],
        },
      },
      {
        tipo: "estatisticas",
        config: {
          itens: [
            { numero: "+840", rotulo: "alunos no método" },
            { numero: "R$31 mi", rotulo: "gerados pelos alunos" },
            { numero: "93%", rotulo: "renovariam a compra" },
          ],
        },
      },
      {
        tipo: "midiatexto",
        config: {
          eyebrow: "A verdade incômoda",
          titulo: "Indicação não é estratégia. É sorte com outro nome.",
          corpo: "Todo mês a mesma roleta: será que vem cliente? Você é excelente no que faz, mas quem depende de indicação vive refém do acaso — sem previsibilidade, sem como planejar crescimento, aceitando qualquer cliente para pagar as contas.",
          posicao: "direita",
          itens: ["Meses bons e meses de pânico", "Clientes que pechincham seu preço", "Zero controle sobre o próprio crescimento"],
        },
      },
      {
        tipo: "passos",
        config: {
          eyebrow: "O mecanismo",
          titulo: "O Sistema A.C.E. — as 3 alavancas da captação previsível",
          subtitulo: "Não é mais conteúdo, nem mais rede social. São 3 alavancas na ordem certa.",
          itens: [
            { titulo: "Atração", texto: "Posicionamento magnético + oferta de entrada que faz o cliente certo levantar a mão." },
            { titulo: "Conversão", texto: "Processo de diagnóstico que transforma conversas em contratos sem parecer vendedor." },
            { titulo: "Escala", texto: "Rotina de 5h/semana + tráfego básico para multiplicar o que funciona." },
          ],
        },
      },
      {
        tipo: "cards",
        config: {
          eyebrow: "O programa",
          titulo: "8 módulos, do posicionamento à escala",
          colunas: 4,
          itens: [
            { emoji: "🎯", titulo: "1. Posicionamento", texto: "Defina o nicho e a promessa que fazem o mercado te notar." },
            { emoji: "🧲", titulo: "2. Oferta magnética", texto: "Monte uma oferta de entrada impossível de ignorar." },
            { emoji: "📣", titulo: "3. Canais de atração", texto: "Os 3 canais que trazem cliente sem depender de viral." },
            { emoji: "💬", titulo: "4. Diagnóstico", texto: "O script de conversa que fecha sem pressão." },
            { emoji: "💵", titulo: "5. Precificação", texto: "Cobre caro com segurança e pare de negociar centavos." },
            { emoji: "📈", titulo: "6. Tráfego essencial", texto: "Anúncios simples com R$20/dia que alimentam o sistema." },
            { emoji: "🔁", titulo: "7. Recorrência", texto: "Transforme projetos avulsos em contratos mensais." },
            { emoji: "🚀", titulo: "8. Escala", texto: "Rotina, métricas e time enxuto para crescer sem caos." },
          ],
        },
      },
      {
        tipo: "lista",
        config: {
          eyebrow: "Stack de bônus da turma",
          titulo: "Entrando hoje, você leva junto:",
          itens: [
            "BÔNUS 1 — 4 encontros de mentoria em grupo ao vivo (vale R$1.997)",
            "BÔNUS 2 — Pack de 50 templates de proposta e contrato (vale R$497)",
            "BÔNUS 3 — Auditoria gravada de 10 perfis de alunos (vale R$297)",
            "BÔNUS 4 — Comunidade privada com networking e vagas de parceria",
            "Acesso vitalício + todas as atualizações do método",
          ],
        },
      },
      {
        tipo: "depoimentos",
        config: {
          eyebrow: "Prova",
          titulo: "Resultados de quem aplicou o A.C.E.",
          itens: [
            { texto: "Saí de 2 clientes por indicação para 14 contratos ativos em 5 meses. Tripliquei o faturamento e dobrei meu preço.", autor: "Camila T. • social media → agência" },
            { texto: "O módulo de diagnóstico pagou o curso na primeira semana. Fechei R$9.400 em contratos usando o script.", autor: "André L. • consultor financeiro" },
            { texto: "Achava que era caro. Hoje vejo que caro era continuar como eu estava.", autor: "Paula V. • arquiteta" },
          ],
        },
      },
      {
        tipo: "planos",
        config: {
          eyebrow: "Investimento",
          titulo: "Escolha como quer entrar",
          subtitulo: "Os dois planos dão acesso completo ao método. A diferença é o acompanhamento.",
          itens: [
            {
              nome: "Método completo",
              preco: 1497,
              preco_sufixo: "ou 12x de R$149,70",
              descricao: "Para executar no seu ritmo",
              itens: ["8 módulos completos", "Todos os 4 bônus da turma", "Acesso vitalício", "Comunidade privada"],
              botao: { texto: "Entrar agora", href: "#", estilo: "secundario", rastreio: "PlanoMetodo" },
            },
            {
              nome: "Método + Acompanhamento",
              preco: 2497,
              preco_sufixo: "ou 12x de R$249,70",
              descricao: "Para quem quer ir mais rápido",
              destaque: true,
              selo: "Mais resultado",
              itens: ["Tudo do Método completo", "6 meses de encontros quinzenais", "Correção individual da sua oferta", "Grupo restrito no WhatsApp"],
              botao: { texto: "Quero acompanhamento", href: "#", estilo: "primario", rastreio: "PlanoAcompanhamento" },
            },
          ],
        },
      },
      {
        tipo: "garantia",
        config: {
          emoji: "🛡️",
          selo: "Garantia blindada de 15 dias",
          titulo: "Teste o método inteiro por 15 dias",
          texto: "Assista aos módulos, participe da mentoria, use os templates. Se decidir que não é para você, devolvemos 100% — e você fica com os templates de presente.",
        },
      },
      {
        tipo: "faq",
        config: {
          eyebrow: "Objeções sinceras",
          titulo: "Perguntas que todo mundo faz antes de entrar",
          itens: [
            { pergunta: "Funciona para o meu mercado?", resposta: "O método já foi aplicado por +840 alunos em 60+ nichos de serviço: saúde, design, advocacia, consultoria, beleza, engenharia. As alavancas são as mesmas — o que muda é o exemplo, e há aulas por segmento." },
            { pergunta: "Não tenho tempo. Vou conseguir aplicar?", resposta: "O método foi desenhado para 5h por semana. Aliás, se você não tem tempo, é exatamente porque ainda não tem um sistema — é isso que vamos construir." },
            { pergunta: "Já comprei curso e não apliquei. Por que seria diferente?", resposta: "Por isso existe o plano com acompanhamento: encontros quinzenais com correção do seu material. Não é conteúdo para assistir, é sistema para implementar com cobrança." },
            { pergunta: "E se eu não gostar?", resposta: "15 dias de garantia incondicional. Um email e devolvemos tudo." },
            { pergunta: "Posso parcelar?", resposta: "Sim, em até 12x no cartão. O acesso é liberado na hora." },
          ],
        },
      },
      {
        tipo: "cta",
        config: {
          titulo: "Daqui a 6 meses, você vai estar com a agenda cheia — ou esperando indicação",
          subtitulo: "A turma fecha domingo. A decisão leva 1 minuto; o resultado, uma carreira.",
          botao: { texto: "Entrar para a turma agora", href: "#oferta", estilo: "primario", rastreio: "CTAFinal" },
        },
      },
      {
        tipo: "rodape",
        config: { texto: "Máquina de Clientes", contato: "suporte@maquinadeclientes.com.br" },
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* MENTORIA / HIGH-TICKET POR APLICAÇÃO                                */
  /* Copy: qualificação + autoridade + escassez real                     */
  /* ------------------------------------------------------------------ */
  {
    id: "mentoria",
    nome: "Mentoria (por aplicação)",
    categoria: "Infoprodutos",
    nicho: "mentoria",
    descricao: "Mentoria ou consultoria premium com vagas limitadas e formulário de aplicação.",
    icone: "👑",
    tema: {
      fonte_titulo: "Oswald",
      cores: {
        night: "#0f0d09",
        night2: "#181510",
        night3: "#231e16",
        cream: "#f5f0e6",
        creamDim: "#bab2a0",
        gold: "#d4af37",
        coral: "#d4af37",
        green: "#4cae8a",
        pink: "#c9a15e",
        violet: "#a08a5c",
      },
    },
    blocos: [
      {
        tipo: "cabecalho",
        config: {
          nome: "Mentoria Ápice",
          botao: { texto: "Aplicar para uma vaga", href: "#aplicacao", estilo: "primario", rastreio: "Cabecalho" },
        },
      },
      {
        tipo: "hero",
        config: {
          selo: "Apenas 10 vagas por trimestre • Seleção por aplicação",
          titulo: "6 Meses ao Meu Lado para Construir seu Próximo Patamar",
          subtitulo: "Mentoria individual para empresários que já faturam acima de R$30 mil/mês e querem estrutura para dobrar sem se afogar na operação.",
          alinhamento: "centro",
          botoes: [
            { texto: "Quero aplicar para uma vaga", href: "#aplicacao", estilo: "primario", rastreio: "HeroPrincipal" },
          ],
        },
      },
      {
        tipo: "midiatexto",
        config: {
          eyebrow: "Quem conduz",
          titulo: "Eu já estive exatamente onde você está",
          corpo: "Construí e vendi duas empresas, faturei múltiplos 7 dígitos e cometi os erros caros que você não precisa cometer. Hoje dedico minha agenda a poucos mentorados por vez — porque profundidade não escala, e é ela que gera resultado.",
          posicao: "esquerda",
          itens: ["2 empresas construídas e vendidas", "+R$40 milhões faturados", "+120 empresários mentorados"],
        },
      },
      {
        tipo: "lista",
        config: {
          eyebrow: "Para quem é",
          titulo: "Esta mentoria é para você que…",
          itens: [
            "Já fatura acima de R$30 mil/mês e sente que virou refém do próprio negócio",
            "Quer dobrar o faturamento com estrutura, não com mais horas trabalhadas",
            "Está disposto a ser confrontado e executar o que for combinado",
            "Busca um conselheiro com cicatrizes, não um vendedor de promessas",
          ],
        },
      },
      {
        tipo: "passos",
        config: {
          eyebrow: "Como funciona",
          titulo: "A jornada de 6 meses",
          itens: [
            { titulo: "Diagnóstico profundo", texto: "Imersão inicial de 4h mapeando números, gargalos e o plano do semestre." },
            { titulo: "Encontros quinzenais", texto: "Sessões individuais de 1h30 com plano de ação e cobrança de execução." },
            { titulo: "Acesso direto", texto: "Canal privado comigo para decisões que não podem esperar a próxima sessão." },
            { titulo: "Revisão trimestral", texto: "Balanço de resultados e recalibragem de metas a cada 90 dias." },
          ],
        },
      },
      {
        tipo: "depoimentos",
        config: {
          eyebrow: "Mentorados",
          titulo: "O que dizem os que chegaram lá",
          itens: [
            { texto: "Em 6 meses saí de R$45 mil para R$110 mil/mês — e pela primeira vez tirei férias sem o negócio parar.", autor: "Ricardo M. • e-commerce" },
            { texto: "Não foi só faturamento. Foi clareza. Cada sessão economizou meses de tentativa e erro.", autor: "Fernanda C. • clínica odontológica" },
          ],
        },
      },
      {
        tipo: "estatisticas",
        config: {
          itens: [
            { numero: "10", rotulo: "vagas por trimestre" },
            { numero: "6 meses", rotulo: "de acompanhamento" },
            { numero: "+120", rotulo: "empresários mentorados" },
          ],
        },
      },
      {
        tipo: "formulario",
        config: {
          eyebrow: "Aplicação",
          titulo: "Aplique para uma das 10 vagas",
          subtitulo: "Análise em até 48h. Se houver encaixe, você recebe o convite para uma conversa.",
          campos: [
            { nome: "Nome completo", tipo: "texto", obrigatorio: true },
            { nome: "WhatsApp", tipo: "telefone", obrigatorio: true },
            { nome: "Seu negócio e faturamento mensal atual", tipo: "texto", obrigatorio: true },
            { nome: "Principal desafio hoje", tipo: "texto", obrigatorio: true },
          ],
          botao_texto: "Enviar minha aplicação",
          mensagem_sucesso: "Aplicação recebida. Analisamos em até 48h e retornamos pelo WhatsApp. 🤝",
        },
      },
      {
        tipo: "faq",
        config: {
          eyebrow: "Dúvidas",
          titulo: "Antes de aplicar",
          itens: [
            { pergunta: "Qual o investimento?", resposta: "O valor é apresentado na conversa de seleção, após confirmarmos que há encaixe. Adianto: é um investimento sério, para quem trata o negócio com seriedade." },
            { pergunta: "Por que existe seleção?", resposta: "Porque minha agenda comporta poucos mentorados e o resultado depende de encaixe mútuo. Eu só aceito quem eu tenho convicção de que consigo ajudar." },
            { pergunta: "É online ou presencial?", resposta: "As sessões são online. A imersão inicial pode ser presencial, conforme sua cidade." },
          ],
        },
      },
      {
        tipo: "rodape",
        config: { texto: "Mentoria Ápice", contato: "contato@mentoriaapice.com.br" },
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* COMUNIDADE / ASSINATURA (recorrência)                               */
  /* ------------------------------------------------------------------ */
  {
    id: "comunidade",
    nome: "Comunidade / Assinatura",
    categoria: "Infoprodutos",
    nicho: "comunidade",
    descricao: "Clube de assinatura, comunidade paga ou área de membros com plano mensal e anual.",
    icone: "🤝",
    tema: {
      fonte_titulo: "Montserrat",
      cores: {
        night: "#120b26",
        night2: "#1b1138",
        night3: "#261849",
        cream: "#f5f2ff",
        creamDim: "#c2b8dd",
        gold: "#ffb84d",
        coral: "#8b5cf6",
        green: "#3fd0a4",
        pink: "#e878a6",
        violet: "#9d6be0",
      },
    },
    blocos: [
      {
        tipo: "aviso",
        config: {
          texto: "🎁 Assinatura anual com 2 meses grátis — por tempo limitado",
          link_texto: "Ver planos",
          href: "#planos",
          cor: "violet",
        },
      },
      {
        tipo: "cabecalho",
        config: {
          nome: "Clube Criativo",
          botao: { texto: "Entrar no clube", href: "#planos", estilo: "primario", rastreio: "Cabecalho" },
        },
      },
      {
        tipo: "hero",
        config: {
          selo: "+1.200 membros ativos",
          titulo: "Pare de Aprender Sozinho. Cresça em Comunidade.",
          subtitulo: "Aulas novas toda semana, encontros ao vivo, networking real e um lugar para tirar dúvidas todo dia — por menos de R$2 por dia.",
          alinhamento: "centro",
          botoes: [
            { texto: "Quero fazer parte", href: "#planos", estilo: "primario", rastreio: "HeroPrincipal" },
            { texto: "O que tem dentro", href: "#dentro", estilo: "secundario", rastreio: "HeroSecundario" },
          ],
        },
      },
      {
        tipo: "cards",
        config: {
          eyebrow: "O que tem dentro",
          titulo: "Seu plano de evolução contínua",
          colunas: 3,
          itens: [
            { emoji: "🎓", titulo: "Aulas semanais", texto: "Conteúdo novo toda semana, direto ao ponto, com material de apoio." },
            { emoji: "🔴", titulo: "Encontros ao vivo", texto: "2 lives mensais com convidados + sessões de perguntas abertas." },
            { emoji: "💬", titulo: "Comunidade ativa", texto: "Tire dúvidas, receba feedback e feche parcerias todos os dias." },
            { emoji: "📚", titulo: "Biblioteca completa", texto: "+150 aulas gravadas organizadas por trilha, do básico ao avançado." },
            { emoji: "🏆", titulo: "Desafios mensais", texto: "Projetos práticos com premiação e destaque para os melhores." },
            { emoji: "🎟️", titulo: "Vantagens de membro", texto: "Descontos em ferramentas parceiras e prioridade em eventos." },
          ],
        },
      },
      {
        tipo: "estatisticas",
        config: {
          itens: [
            { numero: "+1.200", rotulo: "membros ativos" },
            { numero: "+150", rotulo: "aulas na biblioteca" },
            { numero: "24", rotulo: "lives por ano" },
          ],
        },
      },
      {
        tipo: "depoimentos",
        config: {
          eyebrow: "Membros",
          titulo: "Quem entrou, ficou",
          itens: [
            { texto: "Já paguei cursos de R$2.000 que renderam menos que 3 meses de clube. A comunidade responde tudo em minutos.", autor: "Larissa M. • membro há 1 ano" },
            { texto: "Fechei dois clientes dentro da própria comunidade. A assinatura se paga sozinha.", autor: "João P. • membro há 8 meses" },
          ],
        },
      },
      {
        tipo: "planos",
        config: {
          eyebrow: "Planos",
          titulo: "Escolha o seu ritmo",
          subtitulo: "Cancele quando quiser, sem multa e sem burocracia.",
          itens: [
            {
              nome: "Mensal",
              preco: 57,
              preco_sufixo: "/mês",
              descricao: "Flexibilidade total",
              itens: ["Acesso completo a tudo", "Cancele quando quiser"],
              botao: { texto: "Assinar mensal", href: "#", estilo: "secundario", rastreio: "PlanoMensal" },
            },
            {
              nome: "Anual",
              preco: 570,
              preco_sufixo: "/ano (2 meses grátis)",
              descricao: "O preferido dos membros",
              destaque: true,
              selo: "Economize R$114",
              itens: ["Tudo do plano mensal", "2 meses grátis no ano", "Badge de membro fundador", "1 sessão de mentoria em grupo/ano"],
              botao: { texto: "Assinar anual", href: "#", estilo: "primario", rastreio: "PlanoAnual" },
            },
          ],
        },
      },
      {
        tipo: "garantia",
        config: {
          emoji: "🔓",
          selo: "Sem fidelidade",
          titulo: "Entre e saia quando quiser",
          texto: "Sem contrato, sem multa, sem pegadinha. Se o clube não fizer sentido para você, cancela em 2 cliques direto na plataforma.",
        },
      },
      {
        tipo: "faq",
        config: {
          eyebrow: "Dúvidas",
          titulo: "Perguntas frequentes",
          itens: [
            { pergunta: "Sou iniciante. Vou acompanhar?", resposta: "Sim! A biblioteca tem trilhas do zero absoluto ao avançado, e a comunidade adora ajudar quem está começando." },
            { pergunta: "Quanto tempo preciso dedicar?", resposta: "2 a 3 horas por semana já geram evolução visível. Tudo fica gravado para o seu ritmo." },
            { pergunta: "Como cancelo?", resposta: "Direto na plataforma, em 2 cliques, sem falar com ninguém." },
          ],
        },
      },
      {
        tipo: "rodape",
        config: { texto: "Clube Criativo", contato: "oi@clubecriativo.com.br", instagram_url: "https://instagram.com" },
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* PÁGINA DE OBRIGADO + UPSELL (pós-compra / pós-cadastro)             */
  /* ------------------------------------------------------------------ */
  {
    id: "pagina-obrigado",
    nome: "Obrigado + Upsell",
    categoria: "Funil",
    nicho: "obrigado",
    descricao: "Página pós-compra ou pós-cadastro: confirma, orienta os próximos passos e faz uma oferta única.",
    icone: "🎉",
    tema: {
      cores: {
        night: "#0c1f16",
        night2: "#123024",
        night3: "#1a4231",
        cream: "#f1f8f3",
        creamDim: "#bdd4c5",
        gold: "#f4c04b",
        coral: "#37b08a",
        green: "#37b08a",
        pink: "#e58fb0",
        violet: "#8fbf9f",
      },
    },
    blocos: [
      {
        tipo: "hero",
        config: {
          selo: "✅ Tudo certo!",
          titulo: "Pedido Confirmado. Bem-vindo(a)! 🎉",
          subtitulo: "Seu acesso já está a caminho do seu email. Enquanto isso, siga os 3 passos abaixo para começar com o pé direito.",
          alinhamento: "centro",
        },
      },
      {
        tipo: "passos",
        config: {
          eyebrow: "Próximos passos",
          titulo: "Faça isso agora (leva 2 minutos)",
          itens: [
            { titulo: "Confira seu email", texto: "O acesso chega em até 5 minutos. Olhe também o spam e a aba Promoções." },
            { titulo: "Salve nosso contato", texto: "Adicione nosso número para receber avisos importantes no WhatsApp." },
            { titulo: "Entre na comunidade", texto: "Apresente-se no grupo de alunos — é lá que a mágica acontece." },
          ],
        },
      },
      {
        tipo: "aviso",
        config: {
          texto: "⏳ Oferta exclusiva desta página — ela não aparece de novo",
          cor: "gold",
        },
      },
      {
        tipo: "midiatexto",
        config: {
          eyebrow: "Só para novos alunos",
          titulo: "Quer acelerar seu resultado em 10x?",
          corpo: "Quem está entrando agora pode adicionar a Masterclass de Implementação — 4 horas de conteúdo prático onde eu monto tudo na sua frente, passo a passo — por uma fração do preço normal.",
          posicao: "esquerda",
          itens: ["4h de implementação gravada na prática", "Modelos prontos para copiar e colar", "Acesso vitalício junto do seu produto"],
        },
      },
      {
        tipo: "oferta",
        config: {
          eyebrow: "Oferta única de novo aluno",
          titulo: "De R$297 por apenas:",
          preco: 97,
          preco_sufixo: "só nesta página",
          aviso: "Ao sair desta página, a oferta expira e volta ao preço normal.",
          botao: { texto: "SIM! Adicionar ao meu pedido", href: "#", estilo: "primario", rastreio: "Upsell" },
        },
      },
      {
        tipo: "cta",
        config: {
          titulo: "Prefere seguir sem o acelerador?",
          subtitulo: "Sem problema — seu acesso principal já está garantido no seu email.",
          botao: { texto: "Não, obrigado. Quero só meu acesso →", href: "#", estilo: "secundario", rastreio: "RecusarUpsell" },
        },
      },
      {
        tipo: "rodape",
        config: { texto: "Suporte", contato: "suporte@seuproduto.com.br" },
      },
    ],
  },
];

export const TEMPLATES_POR_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

export const CATEGORIAS_TEMPLATE = [...new Set(TEMPLATES.map((t) => t.categoria))];
