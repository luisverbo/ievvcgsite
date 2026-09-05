// Tipos do domínio multi-tenant do PáginaPro.

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

export type Plano = "free" | "pro" | "agencia" | "prospector" | "teste";

export type Organizacao = {
  id: string;
  nome: string;
  plano: Plano;
  created_at: string;
};

export type Membro = {
  org_id: string;
  user_id: string;
  papel: "dono" | "editor";
};

export type Site = {
  id: string;
  org_id: string;
  slug: string;
  nome: string;
  tema: Tema;
  logo_url: string | null;
  whatsapp_numero: string | null;
  facebook_pixel_id: string | null;
  publicado: boolean;
  created_at: string;
};

export type Pagina = {
  id: string;
  org_id: string;
  site_id: string;
  slug: string; // "" = página inicial do site
  titulo: string;
  descricao_seo: string | null;
  og_image_url: string | null;
  funil_id: string | null;
  etapa_ordem: number | null;
  publicado: boolean;
  ordem: number;
  // null/vazio = herda as cores e fontes do site
  tema?: Tema | null;
  created_at: string;
};

export type Bloco = {
  id: string;
  org_id: string;
  pagina_id: string;
  tipo: string;
  config: Record<string, unknown>;
  ordem: number;
  oculto: boolean;
};

export type Funil = {
  id: string;
  org_id: string;
  site_id: string;
  nome: string;
  created_at: string;
};

export type TemplateRow = {
  id: string;
  categoria: string;
  nicho: string;
  nome: string;
  descricao: string | null;
  preview_url: string | null;
  tema: Tema;
  blocos: { tipo: string; config: Record<string, unknown> }[];
};

export type Lead = {
  id: string;
  org_id: string;
  site_id: string;
  pagina_id: string | null;
  dados: Record<string, string>;
  origem: string | null;
  created_at: string;
};
