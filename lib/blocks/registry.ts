// Catálogo de blocos: fonte única da biblioteca do editor. Sem componentes
// aqui (server-safe) — só metadados e o config padrão de cada bloco.

export type BlocoCategoria =
  | "Essenciais"
  | "Conteúdo"
  | "Mídia"
  | "Prova social"
  | "Conversão";

export type BlocoDef = {
  tipo: string;
  nome: string;
  categoria: BlocoCategoria;
  icone: string;
  descricao: string;
  defaultConfig: Record<string, unknown>;
};

export const BLOCOS: BlocoDef[] = [
  {
    tipo: "cabecalho",
    nome: "Cabeçalho",
    categoria: "Essenciais",
    icone: "▭",
    descricao: "Logo/nome no topo e um botão de ação.",
    defaultConfig: {
      nome: "Sua Marca",
      fixo: true,
      botao: { texto: "Fale conosco", href: "#contato", estilo: "primario", rastreio: "Cabecalho" },
    },
  },
  {
    tipo: "hero",
    nome: "Destaque (Hero)",
    categoria: "Essenciais",
    icone: "★",
    descricao: "A primeira dobra: título forte, subtítulo e botões.",
    defaultConfig: {
      selo: "Novidade",
      titulo: "Uma frase que conquista seu cliente",
      subtitulo: "Explique em uma linha o valor do que você oferece.",
      alinhamento: "centro",
      botoes: [
        { texto: "Quero começar", href: "#oferta", estilo: "primario", rastreio: "HeroPrincipal" },
        { texto: "Saiba mais", href: "#sobre", estilo: "secundario", rastreio: "HeroSecundario" },
      ],
    },
  },
  {
    tipo: "texto",
    nome: "Texto / Seção",
    categoria: "Conteúdo",
    icone: "¶",
    descricao: "Um título e um parágrafo de conteúdo.",
    defaultConfig: {
      eyebrow: "Sobre",
      titulo: "Conte sua história",
      corpo: "Use este espaço para explicar quem você é e por que as pessoas devem confiar em você.",
      alinhamento: "centro",
    },
  },
  {
    tipo: "imagem",
    nome: "Imagem",
    categoria: "Mídia",
    icone: "🖼️",
    descricao: "Uma imagem com legenda opcional.",
    defaultConfig: { largura: "media", legenda: "" },
  },
  {
    tipo: "video",
    nome: "Vídeo",
    categoria: "Mídia",
    icone: "▶",
    descricao: "YouTube, Shorts, Instagram ou upload.",
    defaultConfig: { titulo: "Assista" },
  },
  {
    tipo: "cta",
    nome: "Chamada para ação",
    categoria: "Conversão",
    icone: "➜",
    descricao: "Um convite direto com um botão.",
    defaultConfig: {
      titulo: "Pronto para começar?",
      subtitulo: "Dê o próximo passo agora mesmo.",
      botao: { texto: "Quero agora", href: "#", estilo: "primario", rastreio: "CTA" },
    },
  },
  {
    tipo: "cards",
    nome: "Cards em grade",
    categoria: "Conteúdo",
    icone: "▦",
    descricao: "Benefícios, serviços ou passos, lado a lado.",
    defaultConfig: {
      eyebrow: "Vantagens",
      titulo: "Por que escolher a gente",
      colunas: 3,
      itens: [
        { emoji: "⚡", titulo: "Rápido", texto: "Resultado sem enrolação." },
        { emoji: "💎", titulo: "Qualidade", texto: "Feito com capricho." },
        { emoji: "🤝", titulo: "Confiança", texto: "Do seu lado sempre." },
      ],
    },
  },
  {
    tipo: "lista",
    nome: "Lista com checks",
    categoria: "Conteúdo",
    icone: "✓",
    descricao: "Itens com marcador de confirmação.",
    defaultConfig: {
      eyebrow: "Incluído",
      titulo: "O que você recebe",
      itens: ["Primeiro benefício", "Segundo benefício", "Terceiro benefício"],
    },
  },
  {
    tipo: "galeria",
    nome: "Galeria de fotos",
    categoria: "Mídia",
    icone: "▤",
    descricao: "Grade de imagens (trabalhos, produtos…).",
    defaultConfig: { eyebrow: "Portfólio", titulo: "Alguns trabalhos", imagens: [] },
  },
  {
    tipo: "depoimentos",
    nome: "Depoimentos",
    categoria: "Prova social",
    icone: "❝",
    descricao: "O que seus clientes dizem.",
    defaultConfig: {
      eyebrow: "Depoimentos",
      titulo: "Quem já experimentou",
      itens: [
        { texto: "Simplesmente incrível, recomendo demais!", autor: "Cliente satisfeito" },
      ],
    },
  },
  {
    tipo: "faq",
    nome: "Perguntas frequentes",
    categoria: "Conteúdo",
    icone: "?",
    descricao: "Acordeão de dúvidas comuns.",
    defaultConfig: {
      eyebrow: "Dúvidas",
      titulo: "Perguntas frequentes",
      itens: [
        { pergunta: "Como funciona?", resposta: "Explique aqui em poucas linhas." },
        { pergunta: "Quanto custa?", resposta: "Fale sobre o preço ou como orçar." },
      ],
    },
  },
  {
    tipo: "oferta",
    nome: "Oferta / Preço",
    categoria: "Conversão",
    icone: "🏷️",
    descricao: "Preço, contagem regressiva e botão de compra.",
    defaultConfig: {
      eyebrow: "Oferta",
      titulo: "Garanta o seu",
      preco: 97,
      preco_sufixo: "à vista",
      aviso: "Vagas limitadas.",
      botao: { texto: "Comprar agora", href: "#", estilo: "primario", rastreio: "Comprar" },
    },
  },
  {
    tipo: "formulario",
    nome: "Formulário de captura",
    categoria: "Conversão",
    icone: "✉",
    descricao: "Capte nome, email e telefone (vira lead).",
    defaultConfig: {
      eyebrow: "Contato",
      titulo: "Fale com a gente",
      subtitulo: "Preencha e retornamos rapidinho.",
      campos: [
        { nome: "Nome", tipo: "texto", obrigatorio: true },
        { nome: "Email", tipo: "email", obrigatorio: true },
        { nome: "Telefone", tipo: "telefone", obrigatorio: false },
      ],
      botao_texto: "Enviar",
      mensagem_sucesso: "Recebido! Em breve entramos em contato.",
    },
  },
  {
    tipo: "logos",
    nome: "Logos / Parceiros",
    categoria: "Prova social",
    icone: "◇",
    descricao: "Marcas que confiam em você.",
    defaultConfig: { eyebrow: "Parceiros", titulo: "Quem confia na gente", logos: [] },
  },
  {
    tipo: "rodape",
    nome: "Rodapé",
    categoria: "Essenciais",
    icone: "▁",
    descricao: "Contatos e redes sociais no fim da página.",
    defaultConfig: {
      texto: "Sua Marca",
      contato: "contato@suamarca.com.br",
    },
  },
  {
    tipo: "aviso",
    nome: "Barra de aviso",
    categoria: "Conversão",
    icone: "📢",
    descricao: "Faixa fina de urgência ou promoção no topo.",
    defaultConfig: {
      texto: "🔥 Últimas vagas com desconto",
      link_texto: "Aproveitar agora",
      href: "#oferta",
      cor: "gold",
    },
  },
  {
    tipo: "estatisticas",
    nome: "Números / Estatísticas",
    categoria: "Prova social",
    icone: "📊",
    descricao: "Resultados em números grandes (alunos, anos, clientes).",
    defaultConfig: {
      itens: [
        { numero: "+2.000", rotulo: "clientes atendidos" },
        { numero: "10 anos", rotulo: "de experiência" },
        { numero: "4,9★", rotulo: "de avaliação média" },
      ],
    },
  },
  {
    tipo: "passos",
    nome: "Como funciona (passos)",
    categoria: "Conteúdo",
    icone: "➊",
    descricao: "Processo em 3 ou 4 passos numerados.",
    defaultConfig: {
      eyebrow: "Como funciona",
      titulo: "Simples assim",
      itens: [
        { titulo: "Você entra em contato", texto: "Preencha o formulário ou chame no WhatsApp." },
        { titulo: "Montamos seu plano", texto: "Uma proposta pensada para o seu caso." },
        { titulo: "Resultado entregue", texto: "Você acompanha tudo de perto, sem surpresa." },
      ],
    },
  },
  {
    tipo: "planos",
    nome: "Planos / Preços",
    categoria: "Conversão",
    icone: "💳",
    descricao: "Tabela de 2 ou 3 planos com destaque no mais vendido.",
    defaultConfig: {
      eyebrow: "Planos",
      titulo: "Escolha o seu",
      itens: [
        {
          nome: "Básico",
          preco: 97,
          preco_sufixo: "/mês",
          descricao: "Para começar",
          itens: ["Recurso essencial", "Suporte por email"],
          botao: { texto: "Começar", href: "#", estilo: "secundario", rastreio: "PlanoBasico" },
        },
        {
          nome: "Completo",
          preco: 197,
          preco_sufixo: "/mês",
          descricao: "O mais escolhido",
          destaque: true,
          selo: "Mais popular",
          itens: ["Tudo do Básico", "Recursos avançados", "Suporte prioritário"],
          botao: { texto: "Quero este", href: "#", estilo: "primario", rastreio: "PlanoCompleto" },
        },
      ],
    },
  },
  {
    tipo: "garantia",
    nome: "Garantia",
    categoria: "Conversão",
    icone: "🛡️",
    descricao: "Selo de garantia que reduz o medo de comprar.",
    defaultConfig: {
      emoji: "🛡️",
      selo: "Garantia de 7 dias",
      titulo: "Risco zero para você",
      texto: "Se em até 7 dias você achar que não é para você, devolvemos 100% do valor. Sem perguntas, sem burocracia.",
    },
  },
  {
    tipo: "midiatexto",
    nome: "Imagem + Texto",
    categoria: "Conteúdo",
    icone: "◧",
    descricao: "Foto ou vídeo de um lado, texto e checks do outro.",
    defaultConfig: {
      eyebrow: "Sobre",
      titulo: "Mostre e conte ao mesmo tempo",
      corpo: "Combine uma boa imagem com um texto direto. Este é um dos formatos que mais geram confiança.",
      posicao: "esquerda",
      itens: ["Primeiro diferencial", "Segundo diferencial"],
      botao: { texto: "Saiba mais", href: "#", estilo: "secundario", rastreio: "MidiaTexto" },
    },
  },
  {
    tipo: "html",
    nome: "HTML / Código",
    categoria: "Conversão",
    icone: "</>",
    descricao: "Cole um botão de checkout (Kiwify, Hotmart…) ou qualquer código embed.",
    defaultConfig: { html: "", largura: "media" },
  },
];

export const BLOCOS_POR_TIPO = new Map(BLOCOS.map((b) => [b.tipo, b]));

export function defaultConfig(tipo: string): Record<string, unknown> {
  const def = BLOCOS_POR_TIPO.get(tipo);
  // clona para não compartilhar referências entre blocos
  return def ? structuredClone(def.defaultConfig) : {};
}

export const CATEGORIAS: BlocoCategoria[] = [
  "Essenciais",
  "Conteúdo",
  "Conversão",
  "Prova social",
  "Mídia",
];

// Blocos que semeiam a home de um site recém-criado.
export const HOME_INICIAL = ["cabecalho", "hero", "cards", "cta", "rodape"];
