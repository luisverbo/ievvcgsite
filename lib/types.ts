export type TemaCores = {
  night?: string;
  night2?: string;
  night3?: string;
  cream?: string;
  creamDim?: string;
  gold?: string;
  coral?: string;
  green?: string;
  pink?: string;
  violet?: string;
};

export type Tema = {
  cores?: TemaCores;
  fonte_titulo?: string;
  fonte_texto?: string;
};

export type ConfigEvento = {
  id: string;
  titulo_hero: string;
  subtitulo_hero: string;
  video_hero_url: string | null;
  texto_sobre: string;
  data_evento: string;
  preco_ingresso: number;
  link_compra: string | null;
  endereco: string;
  telefone: string | null;
  email: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  site_url: string | null;
  whatsapp_numero: string | null;
  botao_lineup_texto: string;
  botao_lineup_visivel: boolean;
  logo_url: string | null;
  tema: Tema;
};

export type Artista = {
  id: string;
  nome: string;
  estilo: string;
  pais: string;
  descricao: string;
  foto_url: string | null;
  video_url: string | null;
  ordem: number;
  ativo: boolean;
};

export type ProgramacaoItem = {
  id: string;
  dia: string;
  horario: string;
  descricao: string;
  ordem: number;
};

export type Comida = {
  id: string;
  pais: string;
  prato: string;
  emoji: string;
  ordem: number;
};

export type GaleriaItem = {
  id: string;
  imagem_url: string;
  ordem: number;
};

export type FaqItemRow = {
  id: string;
  pergunta: string;
  resposta: string;
  ordem: number;
};

export type Patrocinador = {
  id: string;
  nome: string;
  logo_url: string | null;
  link_url: string | null;
  ordem: number;
};
