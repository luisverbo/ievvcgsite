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
