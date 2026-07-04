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
];

export const TEMPLATES_POR_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

export const CATEGORIAS_TEMPLATE = [...new Set(TEMPLATES.map((t) => t.categoria))];
