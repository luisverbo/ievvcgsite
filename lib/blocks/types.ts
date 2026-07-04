// Config de cada tipo de bloco. Tudo vive no jsonb `blocos.config`.
// Campos opcionais para os blocos degradarem bem quando algo não é preenchido.

export type BotaoConfig = {
  texto: string;
  href: string;
  estilo?: "primario" | "secundario";
  rastreio?: string; // rótulo para métricas (data-track)
};

export type CabecalhoConfig = {
  logo_url?: string | null;
  nome?: string;
  botao?: BotaoConfig | null;
  fixo?: boolean;
};

export type HeroConfig = {
  selo?: string;
  titulo: string;
  subtitulo?: string;
  imagem_url?: string | null;
  video_url?: string | null;
  botoes?: BotaoConfig[];
  alinhamento?: "centro" | "esquerda";
};

export type TextoConfig = {
  eyebrow?: string;
  titulo?: string;
  corpo?: string;
  alinhamento?: "centro" | "esquerda";
};

export type ImagemConfig = {
  imagem_url?: string | null;
  legenda?: string;
  largura?: "total" | "media";
};

export type VideoConfig = {
  titulo?: string;
  video_url?: string | null;
  poster_url?: string | null;
};

export type CtaConfig = {
  titulo?: string;
  subtitulo?: string;
  botao: BotaoConfig;
};

export type CardItem = { emoji?: string; titulo: string; texto?: string };
export type CardsConfig = {
  eyebrow?: string;
  titulo?: string;
  colunas?: 2 | 3 | 4;
  itens: CardItem[];
};

export type ListaConfig = {
  eyebrow?: string;
  titulo?: string;
  itens: string[]; // uma frase por item
};

export type GaleriaConfig = {
  eyebrow?: string;
  titulo?: string;
  imagens: string[]; // urls
};

export type DepoimentoItem = { texto: string; autor?: string; foto_url?: string | null };
export type DepoimentosConfig = {
  eyebrow?: string;
  titulo?: string;
  itens: DepoimentoItem[];
};

export type FaqPar = { pergunta: string; resposta: string };
export type FaqConfig = {
  eyebrow?: string;
  titulo?: string;
  itens: FaqPar[];
};

export type OfertaConfig = {
  eyebrow?: string;
  titulo?: string;
  preco?: number;
  preco_sufixo?: string;
  botao: BotaoConfig;
  aviso?: string;
  data_limite?: string | null; // ISO → mostra countdown
};

export type CampoFormulario = { nome: string; tipo: "texto" | "email" | "telefone"; obrigatorio?: boolean };
export type FormularioConfig = {
  eyebrow?: string;
  titulo?: string;
  subtitulo?: string;
  campos: CampoFormulario[];
  botao_texto?: string;
  mensagem_sucesso?: string;
};

export type LogoItem = { imagem_url: string; href?: string };
export type LogosConfig = {
  eyebrow?: string;
  titulo?: string;
  logos: LogoItem[];
};

export type RodapeConfig = {
  texto?: string;
  instagram_url?: string;
  facebook_url?: string;
  site_url?: string;
  contato?: string;
};

export type AvisoConfig = {
  texto: string;
  link_texto?: string;
  href?: string;
  cor?: "gold" | "coral" | "green" | "violet";
};

export type EstatisticaItem = { numero: string; rotulo: string };
export type EstatisticasConfig = {
  eyebrow?: string;
  titulo?: string;
  itens: EstatisticaItem[];
};

export type PassoItem = { titulo: string; texto?: string };
export type PassosConfig = {
  eyebrow?: string;
  titulo?: string;
  subtitulo?: string;
  itens: PassoItem[];
};

export type PlanoItem = {
  nome: string;
  preco?: number;
  preco_sufixo?: string;
  descricao?: string;
  itens?: string[];
  destaque?: boolean;
  selo?: string;
  botao?: BotaoConfig;
};
export type PlanosConfig = {
  eyebrow?: string;
  titulo?: string;
  subtitulo?: string;
  itens: PlanoItem[];
};

export type GarantiaConfig = {
  emoji?: string;
  titulo?: string;
  texto?: string;
  selo?: string;
};

export type MidiaTextoConfig = {
  eyebrow?: string;
  titulo?: string;
  corpo?: string;
  imagem_url?: string | null;
  video_url?: string | null;
  posicao?: "esquerda" | "direita"; // lado da mídia
  itens?: string[]; // checks opcionais
  botao?: BotaoConfig | null;
};

export type BlocoConfig =
  | CabecalhoConfig
  | HeroConfig
  | TextoConfig
  | ImagemConfig
  | VideoConfig
  | CtaConfig
  | CardsConfig
  | ListaConfig
  | GaleriaConfig
  | DepoimentosConfig
  | FaqConfig
  | OfertaConfig
  | FormularioConfig
  | LogosConfig
  | RodapeConfig
  | AvisoConfig
  | EstatisticasConfig
  | PassosConfig
  | PlanosConfig
  | GarantiaConfig
  | MidiaTextoConfig;

// Contexto que os blocos recebem para render (dados do site).
export type BlocoCtx = {
  siteNome: string;
  logoUrl: string | null;
};
