// Catálogo de templates pré-configurados. Cada template é um conjunto de
// blocos com config realista que pode ser clonado para uma nova página.

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
  blocos: TemplateBloco[];
};

export const TEMPLATES: Template[] = [
  {
    id: "evento",
    nome: "Evento",
    categoria: "Eventos",
    nicho: "evento",
    descricao: "Festa, show, congresso ou qualquer evento com venda de ingressos.",
    icone: "🎭",
    blocos: [
      {
        tipo: "cabecalho",
        config: {
          nome: "Festival Cultural",
          botao: { texto: "Comprar ingresso", href: "#ingresso", estilo: "primario", rastreio: "Cabecalho" },
        },
      },
      {
        tipo: "hero",
        config: {
          selo: "17 de Julho • Parque Central",
          titulo: "O Maior Festival de Cultura da Cidade",
          subtitulo: "3 dias de música ao vivo, gastronomia internacional, arte e muita alegria para toda a família.",
          alinhamento: "centro",
          botoes: [
            { texto: "Garantir meu ingresso", href: "#ingresso", estilo: "primario", rastreio: "HeroPrincipal" },
            { texto: "Ver programação", href: "#programacao", estilo: "secundario", rastreio: "HeroSecundario" },
          ],
        },
      },
      {
        tipo: "cards",
        config: {
          eyebrow: "Destaques",
          titulo: "O que você vai encontrar",
          colunas: 3,
          itens: [
            { emoji: "🎵", titulo: "Música ao vivo", texto: "Shows nacionais e locais no palco principal e secundário." },
            { emoji: "🍽️", titulo: "Gastronomia", texto: "Mais de 30 praças de alimentação com culinária de todos os cantos do mundo." },
            { emoji: "🎨", titulo: "Arte & Cultura", texto: "Exposições, oficinas e apresentações culturais durante todo o evento." },
          ],
        },
      },
      {
        tipo: "faq",
        config: {
          eyebrow: "Dúvidas",
          titulo: "Perguntas frequentes",
          itens: [
            { pergunta: "Crianças podem entrar?", resposta: "Crianças até 12 anos entram gratuitamente acompanhadas de um responsável." },
            { pergunta: "Tem estacionamento?", resposta: "Sim, o local conta com estacionamento pago nas proximidades. Indicamos também o uso de transporte público ou aplicativo." },
            { pergunta: "O ingresso pode ser reembolsado?", resposta: "Sim, aceitamos cancelamentos até 7 dias antes do evento com reembolso integral." },
          ],
        },
      },
      {
        tipo: "oferta",
        config: {
          eyebrow: "Ingressos",
          titulo: "Garanta o seu com antecedência",
          preco: 89,
          preco_sufixo: "por pessoa • acesso nos 3 dias",
          aviso: "Lote promocional — preço sobe em breve.",
          botao: { texto: "Comprar ingresso", href: "#", estilo: "primario", rastreio: "Comprar" },
        },
      },
      {
        tipo: "rodape",
        config: { texto: "Festival Cultural", contato: "contato@festivaldacultura.com.br" },
      },
    ],
  },

  {
    id: "lancamento-digital",
    nome: "Lançamento Digital",
    categoria: "Marketing Digital",
    nicho: "curso",
    descricao: "Curso online, ebook, mentorias ou qualquer infoproduto digital.",
    icone: "🚀",
    blocos: [
      {
        tipo: "cabecalho",
        config: {
          nome: "Curso Pro",
          botao: { texto: "Ver oferta", href: "#oferta", estilo: "primario", rastreio: "Cabecalho" },
        },
      },
      {
        tipo: "hero",
        config: {
          selo: "Vagas abertas — turma limitada",
          titulo: "Aprenda a Vender Online do Zero em 30 Dias",
          subtitulo: "O método prático que já transformou mais de 2.000 alunos em empreendedores digitais de sucesso.",
          alinhamento: "centro",
          botoes: [
            { texto: "Quero minha vaga agora", href: "#oferta", estilo: "primario", rastreio: "HeroPrincipal" },
          ],
        },
      },
      {
        tipo: "texto",
        config: {
          eyebrow: "Por que funciona",
          titulo: "Um método testado, não teoria",
          corpo: "Desenvolvemos este programa depois de ajudar centenas de pessoas a sair do zero e alcançar os primeiros R$10.000 por mês vendendo digitalmente. Aqui você aprende o que funciona de verdade, sem enrolação.",
          alinhamento: "centro",
        },
      },
      {
        tipo: "cards",
        config: {
          eyebrow: "O que você vai aprender",
          titulo: "Conteúdo completo e direto ao ponto",
          colunas: 3,
          itens: [
            { emoji: "📱", titulo: "Módulo 1 — Fundamentos", texto: "Escolha seu nicho, crie sua oferta e monte sua presença digital." },
            { emoji: "💰", titulo: "Módulo 2 — Vendas", texto: "Scripts de venda, tráfego pago e estratégias de conversão." },
            { emoji: "🔄", titulo: "Módulo 3 — Escala", texto: "Automatize processos e construa uma fonte de renda previsível." },
          ],
        },
      },
      {
        tipo: "lista",
        config: {
          eyebrow: "Incluído",
          titulo: "Tudo que está no pacote",
          itens: [
            "Acesso vitalício ao conteúdo + atualizações",
            "Comunidade exclusiva de alunos no grupo privado",
            "Mentoria em grupo todas as semanas",
            "Templates e planilhas prontos para usar",
            "Certificado de conclusão",
          ],
        },
      },
      {
        tipo: "depoimentos",
        config: {
          eyebrow: "Resultados reais",
          titulo: "Quem já passou por aqui",
          itens: [
            { texto: "Em 45 dias apliquei o método e fiz minha primeira venda de R$497. Hoje já ultrapassei os R$8.000 mensais.", autor: "Mariana S., Rio de Janeiro" },
            { texto: "Eu estava sem emprego e não sabia por onde começar. Hoje tenho minha própria marca e loja digital funcionando.", autor: "Carlos M., Belo Horizonte" },
          ],
        },
      },
      {
        tipo: "oferta",
        config: {
          eyebrow: "Oferta de lançamento",
          titulo: "Invista no seu futuro",
          preco: 497,
          preco_sufixo: "à vista • ou 12x de R$49,70",
          aviso: "Garantia incondicional de 7 dias. Se não gostar, devolvemos tudo.",
          botao: { texto: "Quero minha vaga agora", href: "#", estilo: "primario", rastreio: "Comprar" },
        },
      },
      {
        tipo: "faq",
        config: {
          eyebrow: "Dúvidas",
          titulo: "Ficou alguma pergunta?",
          itens: [
            { pergunta: "Preciso ter experiência prévia?", resposta: "Não. O curso foi desenhado do zero, ideal para quem nunca vendeu online." },
            { pergunta: "Por quanto tempo tenho acesso?", resposta: "Para sempre. Seu acesso é vitalício e inclui todas as atualizações futuras sem custo adicional." },
            { pergunta: "E se eu não gostar?", resposta: "Sem problema. Você tem 7 dias para pedir reembolso integral, sem justificativa." },
          ],
        },
      },
      {
        tipo: "rodape",
        config: { texto: "Curso Pro", contato: "suporte@cursopro.com.br" },
      },
    ],
  },

  {
    id: "servico-local",
    nome: "Serviço Local",
    categoria: "Negócios Locais",
    nicho: "servico",
    descricao: "Salão de beleza, clínica, consultório, oficina ou qualquer serviço presencial.",
    icone: "🏪",
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
          titulo: "Realce Sua Beleza com Quem Entende do Assunto",
          subtitulo: "Especialistas em cabelo, unhas e estética há mais de 10 anos. Atendimento personalizado e ambiente aconchegante.",
          alinhamento: "centro",
          botoes: [
            { texto: "Agendar agora", href: "#agendar", estilo: "primario", rastreio: "HeroPrincipal" },
            { texto: "Ver serviços", href: "#servicos", estilo: "secundario", rastreio: "HeroSecundario" },
          ],
        },
      },
      {
        tipo: "cards",
        config: {
          eyebrow: "Nossos serviços",
          titulo: "O que oferecemos",
          colunas: 3,
          itens: [
            { emoji: "✂️", titulo: "Cabelo", texto: "Corte, coloração, mechas, progressiva e tratamentos capilares." },
            { emoji: "💅", titulo: "Unhas", texto: "Manicure, pedicure, gel e nail art de todos os estilos." },
            { emoji: "✨", titulo: "Estética", texto: "Sobrancelha, design, depilação e tratamentos faciais." },
          ],
        },
      },
      {
        tipo: "texto",
        config: {
          eyebrow: "Nossa história",
          titulo: "Por que nos escolher?",
          corpo: "Com mais de uma década de experiência, nosso time de profissionais passa por treinamentos constantes para trazer as tendências mais recentes sem abrir mão da qualidade e do cuidado com cada cliente.",
          alinhamento: "centro",
        },
      },
      {
        tipo: "depoimentos",
        config: {
          eyebrow: "O que dizem",
          titulo: "Clientes que adoram",
          itens: [
            { texto: "Melhor salão que já fui! A atenção é incrível e o resultado sempre supera as expectativas.", autor: "Juliana C." },
            { texto: "Saio de lá me sentindo uma nova pessoa. Já sou cliente fiel há 5 anos.", autor: "Ana Paula M." },
            { texto: "Preço justo, ambiente lindo e profissionais super qualificados. Indico pra todo mundo!", autor: "Fernanda T." },
          ],
        },
      },
      {
        tipo: "formulario",
        config: {
          eyebrow: "Agendamento",
          titulo: "Agende seu horário",
          subtitulo: "Preencha e entramos em contato para confirmar.",
          campos: [
            { nome: "Nome completo", tipo: "texto", obrigatorio: true },
            { nome: "WhatsApp", tipo: "telefone", obrigatorio: true },
            { nome: "Serviço desejado", tipo: "texto", obrigatorio: false },
          ],
          botao_texto: "Quero agendar",
          mensagem_sucesso: "Recebemos seu pedido! Em breve entraremos em contato.",
        },
      },
      {
        tipo: "rodape",
        config: {
          texto: "Studio Beleza",
          contato: "Rua das Flores, 123 • (11) 9 9999-9999",
          instagram_url: "https://instagram.com",
        },
      },
    ],
  },

  {
    id: "portfolio",
    nome: "Portfólio Profissional",
    categoria: "Profissional",
    nicho: "portfolio",
    descricao: "Fotógrafo, designer, nutricionista, advogado ou qualquer profissional liberal.",
    icone: "👤",
    blocos: [
      {
        tipo: "cabecalho",
        config: {
          nome: "João Designer",
          botao: { texto: "Solicitar orçamento", href: "#orcamento", estilo: "primario", rastreio: "Cabecalho" },
        },
      },
      {
        tipo: "hero",
        config: {
          titulo: "Design que Comunica, Vende e Encanta",
          subtitulo: "Identidades visuais e materiais gráficos para marcas que querem se destacar. Mais de 200 projetos entregues.",
          alinhamento: "centro",
          botoes: [
            { texto: "Ver meu portfólio", href: "#portfolio", estilo: "primario", rastreio: "HeroPrincipal" },
            { texto: "Falar comigo", href: "#orcamento", estilo: "secundario", rastreio: "HeroSecundario" },
          ],
        },
      },
      {
        tipo: "texto",
        config: {
          eyebrow: "Sobre mim",
          titulo: "Olá, sou o João",
          corpo: "Designer gráfico com 8 anos de experiência em identidade visual, branding e criação de materiais para marcas de pequeno, médio e grande porte. Formado pela ESPM e apaixonado por design com propósito.",
          alinhamento: "centro",
        },
      },
      {
        tipo: "cards",
        config: {
          eyebrow: "Serviços",
          titulo: "O que posso fazer por você",
          colunas: 3,
          itens: [
            { emoji: "🎨", titulo: "Identidade Visual", texto: "Logo, paleta de cores, tipografia e guia de marca completo." },
            { emoji: "📱", titulo: "Social Media", texto: "Templates e artes para Instagram, LinkedIn e outras redes." },
            { emoji: "📄", titulo: "Material Impresso", texto: "Cartão, flyer, folder, banner e qualquer material offline." },
          ],
        },
      },
      {
        tipo: "galeria",
        config: {
          eyebrow: "Portfólio",
          titulo: "Alguns projetos recentes",
          imagens: [],
        },
      },
      {
        tipo: "depoimentos",
        config: {
          eyebrow: "Clientes",
          titulo: "O que dizem sobre meu trabalho",
          itens: [
            { texto: "O João transformou a identidade da nossa empresa. Hoje recebemos elogios da marca toda semana.", autor: "Marina R., CEO da Boutique Flor" },
            { texto: "Profissional incrível! Entregou antes do prazo e com qualidade absurda. Voltarei com certeza.", autor: "Pedro A., Diretor de Marketing" },
          ],
        },
      },
      {
        tipo: "formulario",
        config: {
          eyebrow: "Orçamento",
          titulo: "Vamos trabalhar juntos?",
          subtitulo: "Conte um pouco sobre o seu projeto.",
          campos: [
            { nome: "Seu nome", tipo: "texto", obrigatorio: true },
            { nome: "Email", tipo: "email", obrigatorio: true },
            { nome: "Sobre o projeto", tipo: "texto", obrigatorio: false },
          ],
          botao_texto: "Solicitar orçamento",
          mensagem_sucesso: "Recebido! Retorno em até 1 dia útil.",
        },
      },
      {
        tipo: "rodape",
        config: {
          texto: "João Designer",
          contato: "joao@design.com.br",
          instagram_url: "https://instagram.com",
        },
      },
    ],
  },

  {
    id: "restaurante",
    nome: "Restaurante / Delivery",
    categoria: "Gastronomia",
    nicho: "restaurante",
    descricao: "Restaurante, lanchonete, café, delivery ou qualquer negócio gastronômico.",
    icone: "🍽️",
    blocos: [
      {
        tipo: "cabecalho",
        config: {
          nome: "Sabor & Cia",
          botao: { texto: "Pedir delivery", href: "#pedido", estilo: "primario", rastreio: "Cabecalho" },
        },
      },
      {
        tipo: "hero",
        config: {
          titulo: "Sabores que Encantam e Memórias que Ficam",
          subtitulo: "Culinária caseira feita com ingredientes frescos, muito amor e as receitas da vovó de sempre.",
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
          titulo: "Especialidades da casa",
          colunas: 3,
          itens: [
            { emoji: "🍖", titulo: "Frango ao Molho", texto: "Frango caipira grelhado com molho de ervas e batata rústica assada." },
            { emoji: "🥩", titulo: "Picanha na Brasa", texto: "Picanha grelhada no carvão com farofa especial e vinagrete." },
            { emoji: "🐟", titulo: "Filé de Peixe", texto: "Peixe fresco grelhado com legumes salteados e arroz integral." },
          ],
        },
      },
      {
        tipo: "galeria",
        config: {
          eyebrow: "Ambiente",
          titulo: "Um lugar para todas as ocasiões",
          imagens: [],
        },
      },
      {
        tipo: "texto",
        config: {
          eyebrow: "Localização e horários",
          titulo: "Venha nos visitar",
          corpo: "Estamos na Rua das Palmeiras, 456 — Centro. Funcionamos de terça a domingo, das 11h30 às 15h (almoço) e das 18h às 22h (jantar). Aceitamos reservas pelo WhatsApp.",
          alinhamento: "centro",
        },
      },
      {
        tipo: "formulario",
        config: {
          eyebrow: "Reservas",
          titulo: "Reserve sua mesa",
          subtitulo: "Confirmamos em até 2 horas.",
          campos: [
            { nome: "Nome", tipo: "texto", obrigatorio: true },
            { nome: "WhatsApp", tipo: "telefone", obrigatorio: true },
            { nome: "Data e horário", tipo: "texto", obrigatorio: true },
          ],
          botao_texto: "Fazer reserva",
          mensagem_sucesso: "Reserva recebida! Confirmamos em breve pelo WhatsApp.",
        },
      },
      {
        tipo: "rodape",
        config: {
          texto: "Sabor & Cia",
          contato: "Rua das Palmeiras, 456 — (11) 9 8888-7777",
          instagram_url: "https://instagram.com",
          facebook_url: "https://facebook.com",
        },
      },
    ],
  },

  {
    id: "imobiliaria",
    nome: "Imobiliária / Corretor",
    categoria: "Imóveis",
    nicho: "imovel",
    descricao: "Corretora, imobiliária ou corretor autônomo de compra, venda e aluguel.",
    icone: "🏠",
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
          titulo: "Encontre o Imóvel Perfeito para Você",
          subtitulo: "Mais de 500 imóveis disponíveis para compra e aluguel. Assessoria completa do início ao fim da negociação.",
          alinhamento: "centro",
          botoes: [
            { texto: "Quero ser atendido", href: "#atendimento", estilo: "primario", rastreio: "HeroPrincipal" },
            { texto: "Ver imóveis", href: "#imoveis", estilo: "secundario", rastreio: "HeroSecundario" },
          ],
        },
      },
      {
        tipo: "cards",
        config: {
          eyebrow: "Tipos de imóvel",
          titulo: "O que procuramos para você",
          colunas: 3,
          itens: [
            { emoji: "🏢", titulo: "Apartamentos", texto: "Studios, 2 e 3 quartos nos melhores bairros da cidade." },
            { emoji: "🏡", titulo: "Casas", texto: "Casas térreas e sobrados com quintal em condomínios fechados." },
            { emoji: "🏬", titulo: "Comercial", texto: "Salas, lojas e galpões para sua empresa crescer." },
          ],
        },
      },
      {
        tipo: "texto",
        config: {
          eyebrow: "Por que a Prime",
          titulo: "Segurança em cada etapa",
          corpo: "Nossa equipe cuida de toda a documentação, negociação e burocracia para que você feche o negócio sem dor de cabeça. Trabalhamos com as principais instituições financeiras para encontrar as melhores condições de financiamento.",
          alinhamento: "centro",
        },
      },
      {
        tipo: "depoimentos",
        config: {
          eyebrow: "Clientes",
          titulo: "Quem já encontrou o lar dos seus sonhos",
          itens: [
            { texto: "O time da Prime foi incrível! Me ajudaram a fechar meu primeiro apartamento em menos de 30 dias.", autor: "Rodrigo F." },
            { texto: "Processo transparente do início ao fim. Finalmente consegui o financiamento que eu precisava.", autor: "Luciana P." },
          ],
        },
      },
      {
        tipo: "formulario",
        config: {
          eyebrow: "Atendimento",
          titulo: "Fale com um corretor agora",
          subtitulo: "Conte o que você procura e retornamos rapidinho.",
          campos: [
            { nome: "Nome", tipo: "texto", obrigatorio: true },
            { nome: "WhatsApp", tipo: "telefone", obrigatorio: true },
            { nome: "O que procura? (compra, aluguel, tipo...)", tipo: "texto", obrigatorio: false },
          ],
          botao_texto: "Quero atendimento",
          mensagem_sucesso: "Ótimo! Um corretor entrará em contato em breve.",
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

  {
    id: "captura-leads",
    nome: "Captura de Leads",
    categoria: "Marketing Digital",
    nicho: "leads",
    descricao: "Isca digital, ebook gratuito, mini-curso ou lista de e-mails.",
    icone: "📧",
    blocos: [
      {
        tipo: "cabecalho",
        config: {
          nome: "Guia Gratuito",
        },
      },
      {
        tipo: "hero",
        config: {
          selo: "100% gratuito",
          titulo: "Baixe o Guia Completo: Como Dobrar suas Vendas em 60 Dias",
          subtitulo: "O passo a passo prático que mais de 5.000 empreendedores já usaram para acelerar os resultados.",
          alinhamento: "centro",
          botoes: [
            { texto: "Quero o guia gratuito", href: "#captura", estilo: "primario", rastreio: "HeroPrincipal" },
          ],
        },
      },
      {
        tipo: "lista",
        config: {
          eyebrow: "Dentro do guia",
          titulo: "O que você vai aprender",
          itens: [
            "Como identificar e atrair seu cliente ideal",
            "As 5 estratégias de venda que mais convertem em 2025",
            "Como montar uma oferta irresistível",
            "O funil de vendas simples que qualquer negócio pode aplicar",
            "Ferramentas gratuitas para automatizar suas vendas",
          ],
        },
      },
      {
        tipo: "depoimentos",
        config: {
          eyebrow: "Quem já baixou",
          titulo: "Resultados de quem aplicou",
          itens: [
            { texto: "Apliquei o método do guia e em 3 semanas já senti a diferença nas minhas vendas. Material incrível!", autor: "Bruna A." },
            { texto: "Simples, direto e funciona de verdade. Recomendo para qualquer empreendedor.", autor: "Rafael N." },
          ],
        },
      },
      {
        tipo: "formulario",
        config: {
          eyebrow: "Acesso gratuito",
          titulo: "Receba o guia agora",
          subtitulo: "Insira seu email e receba o material imediatamente.",
          campos: [
            { nome: "Nome", tipo: "texto", obrigatorio: true },
            { nome: "Melhor email", tipo: "email", obrigatorio: true },
          ],
          botao_texto: "Enviar o guia",
          mensagem_sucesso: "Perfeito! Verifique seu email — o guia foi enviado.",
        },
      },
      {
        tipo: "rodape",
        config: {
          texto: "Guia de Vendas",
          contato: "contato@guiavendas.com.br",
        },
      },
    ],
  },

  {
    id: "produto-fisico",
    nome: "Produto Físico",
    categoria: "E-commerce",
    nicho: "produto",
    descricao: "Loja online, produto artesanal, suplementos, cosméticos ou qualquer produto físico.",
    icone: "📦",
    blocos: [
      {
        tipo: "cabecalho",
        config: {
          nome: "Loja Natura",
          botao: { texto: "Comprar agora", href: "#oferta", estilo: "primario", rastreio: "Cabecalho" },
        },
      },
      {
        tipo: "hero",
        config: {
          selo: "Frete grátis acima de R$99",
          titulo: "Produtos Naturais para o Seu Bem-Estar",
          subtitulo: "Cosméticos veganos, sem parabenos e testados dermatologicamente. Ingredientes da natureza para cuidar de você.",
          alinhamento: "centro",
          botoes: [
            { texto: "Quero comprar", href: "#oferta", estilo: "primario", rastreio: "HeroPrincipal" },
            { texto: "Ver todos os produtos", href: "#produtos", estilo: "secundario", rastreio: "HeroSecundario" },
          ],
        },
      },
      {
        tipo: "cards",
        config: {
          eyebrow: "Diferenciais",
          titulo: "Por que escolher a Loja Natura",
          colunas: 3,
          itens: [
            { emoji: "🌿", titulo: "100% Natural", texto: "Formulações sem químicos agressivos, boas para você e para o planeta." },
            { emoji: "🐇", titulo: "Cruelty-Free", texto: "Nenhum produto nosso é testado em animais. Nunca." },
            { emoji: "✅", titulo: "Testado e aprovado", texto: "Dermatologicamente testado com nota de satisfação acima de 95%." },
          ],
        },
      },
      {
        tipo: "galeria",
        config: {
          eyebrow: "Linha",
          titulo: "Conheça os produtos",
          imagens: [],
        },
      },
      {
        tipo: "depoimentos",
        config: {
          eyebrow: "Avaliações",
          titulo: "Clientes que amam os produtos",
          itens: [
            { texto: "Uso há 3 meses e minha pele nunca esteve tão bem. Produto incrível, embalagem linda e entrega rápida!", autor: "Camila R. ⭐⭐⭐⭐⭐" },
            { texto: "Finalmente achei um creme que hidrata de verdade sem deixar aquela sensação pegajosa. Amei!", autor: "Isabela F. ⭐⭐⭐⭐⭐" },
          ],
        },
      },
      {
        tipo: "oferta",
        config: {
          eyebrow: "Promoção",
          titulo: "Kit Hidratação Completo",
          preco: 189,
          preco_sufixo: "à vista com frete grátis",
          aviso: "Estoque limitado — garantia de 30 dias ou devolvemos o dinheiro.",
          botao: { texto: "Quero o kit agora", href: "#", estilo: "primario", rastreio: "Comprar" },
        },
      },
      {
        tipo: "faq",
        config: {
          eyebrow: "Dúvidas",
          titulo: "Perguntas frequentes",
          itens: [
            { pergunta: "Qual o prazo de entrega?", resposta: "Entregamos em até 5 dias úteis para todo o Brasil. Regiões Sul e Sudeste costumam receber em 2-3 dias." },
            { pergunta: "E se eu não gostar?", resposta: "Oferecemos 30 dias de garantia. Se não ficar satisfeito, devolvemos 100% do valor pago." },
            { pergunta: "Os produtos têm validade?", resposta: "Sim, todos os produtos têm validade mínima de 18 meses a partir da data de compra." },
          ],
        },
      },
      {
        tipo: "rodape",
        config: {
          texto: "Loja Natura",
          contato: "sac@lojatura.com.br",
          instagram_url: "https://instagram.com",
        },
      },
    ],
  },

  {
    id: "link-in-bio",
    nome: "Link-in-Bio",
    categoria: "Redes Sociais",
    nicho: "bio",
    descricao: "Página simples com seus principais links para colocar no Instagram ou TikTok.",
    icone: "🔗",
    blocos: [
      {
        tipo: "cabecalho",
        config: { nome: "@seuperfil" },
      },
      {
        tipo: "hero",
        config: {
          titulo: "@seuperfil",
          subtitulo: "Criadora de conteúdo digital • Dicas de lifestyle, viagens e bem-estar",
          alinhamento: "centro",
          botoes: [
            { texto: "📸 Instagram", href: "https://instagram.com", estilo: "primario", rastreio: "LinkInstagram" },
          ],
        },
      },
      {
        tipo: "lista",
        config: {
          eyebrow: "Meus links",
          titulo: "Tudo em um só lugar",
          itens: [
            "🎥 Canal no YouTube — vídeos toda semana",
            "📚 Ebook gratuito: Guia de Viagens no Brasil",
            "🛍️ Minha loja online — produtos selecionados",
            "💌 Newsletter — dicas toda quinta-feira",
            "📩 Contato para parcerias e publicidade",
          ],
        },
      },
      {
        tipo: "formulario",
        config: {
          eyebrow: "Fique por dentro",
          titulo: "Receba minhas novidades",
          subtitulo: "Sem spam. Só conteúdo bom.",
          campos: [
            { nome: "Nome", tipo: "texto", obrigatorio: true },
            { nome: "Email", tipo: "email", obrigatorio: true },
          ],
          botao_texto: "Quero receber",
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

  {
    id: "webinar-vsl",
    nome: "Webinar / VSL",
    categoria: "Marketing Digital",
    nicho: "webinar",
    descricao: "Webinar ao vivo, gravado ou vídeo de vendas (VSL) com oferta no final.",
    icone: "📹",
    blocos: [
      {
        tipo: "cabecalho",
        config: {
          nome: "Webinar ao Vivo",
          botao: { texto: "Garantir minha vaga", href: "#inscricao", estilo: "primario", rastreio: "Cabecalho" },
        },
      },
      {
        tipo: "hero",
        config: {
          selo: "Aula ao vivo • Gratuito",
          titulo: "Como Triplicar Seus Resultados com Tráfego Pago em 90 Dias",
          subtitulo: "Webinar exclusivo e gratuito com especialista certificado. Vagas limitadas — inscreva-se agora.",
          alinhamento: "centro",
          botoes: [
            { texto: "Garantir minha vaga gratuita", href: "#inscricao", estilo: "primario", rastreio: "HeroPrincipal" },
          ],
        },
      },
      {
        tipo: "video",
        config: {
          titulo: "Assista ao convite",
          video_url: "",
        },
      },
      {
        tipo: "lista",
        config: {
          eyebrow: "Neste webinar você vai aprender",
          titulo: "O que vamos ver juntos",
          itens: [
            "O erro #1 que faz 90% das campanhas fracassarem",
            "A estrutura de anúncio que converte mesmo com R$10/dia",
            "Como escolher o público certo (e parar de desperdiçar verba)",
            "Estratégia de retargeting para recuperar quem não comprou",
            "Case real: de R$3k para R$47k em vendas em 3 meses",
          ],
        },
      },
      {
        tipo: "texto",
        config: {
          eyebrow: "Sobre o especialista",
          titulo: "Quem vai te ensinar",
          corpo: "Especialista em tráfego pago com mais de 8 anos de experiência e mais de R$10 milhões gerenciados em anúncios digitais. Já ajudou mais de 300 empresas a escalar suas vendas com Facebook Ads e Google Ads.",
          alinhamento: "centro",
        },
      },
      {
        tipo: "formulario",
        config: {
          eyebrow: "Inscrição",
          titulo: "Reserve seu lugar agora",
          subtitulo: "É gratuito. Você receberá o link por email.",
          campos: [
            { nome: "Nome completo", tipo: "texto", obrigatorio: true },
            { nome: "Melhor email", tipo: "email", obrigatorio: true },
            { nome: "WhatsApp", tipo: "telefone", obrigatorio: false },
          ],
          botao_texto: "Quero minha vaga gratuita",
          mensagem_sucesso: "Inscrição confirmada! Verifique seu email para detalhes.",
        },
      },
      {
        tipo: "faq",
        config: {
          eyebrow: "Dúvidas",
          titulo: "Ficou alguma dúvida?",
          itens: [
            { pergunta: "O webinar é mesmo gratuito?", resposta: "Sim, 100% gratuito. Não pedimos cartão de crédito em nenhum momento." },
            { pergunta: "E se eu não puder participar ao vivo?", resposta: "Quem se inscrever receberá acesso à gravação por 48h após o evento." },
          ],
        },
      },
      {
        tipo: "rodape",
        config: {
          texto: "Webinar ao Vivo",
          contato: "suporte@webinar.com.br",
        },
      },
    ],
  },
];

export const TEMPLATES_POR_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

export const CATEGORIAS_TEMPLATE = [...new Set(TEMPLATES.map((t) => t.categoria))];
