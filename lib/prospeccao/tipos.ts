// Tipos compartilhados da prospecção (usados no servidor e no navegador).

export type SituacaoDigital =
  | "sem_nada"
  | "social"
  | "site_quebrado"
  | "site_antigo"
  | "site_moderno";

export type StatusProspecto = "novo" | "contactado" | "respondeu" | "fechou" | "descartado";

// O que a busca devolve, antes de virar linha no banco.
export type EmpresaEncontrada = {
  fonte_id: string;
  nome: string;
  categoria?: string;
  endereco?: string;
  telefone?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  lat?: number;
  lon?: number;
  // Sinais de cadastro preenchido — proxy de "negócio ativo" quando a fonte
  // não tem avaliações (caso do OpenStreetMap).
  temHorario: boolean;
  temEmail: boolean;
  // Só o Google traz: é o sinal mais forte de vitalidade que existe.
  avaliacoes?: number;
  notaMedia?: number;
  fonteUrl?: string;
};

export type Eixos = {
  situacao: number;
  vitalidade: number;
  segmento: number;
  contato: number;
};

export type Potencial = {
  pontuacao: number;
  eixos: Eixos;
  motivos: string[];
  situacao: SituacaoDigital;
};

export type ProspectoRow = {
  id: string;
  org_id: string;
  fonte: string;
  fonte_id: string;
  nome: string;
  categoria: string | null;
  endereco: string | null;
  telefone: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  nicho_busca: string | null;
  local_busca: string | null;
  situacao: SituacaoDigital;
  pontuacao: number;
  eixos: Eixos;
  motivos: string[];
  status: StatusProspecto;
  avaliacoes: number | null;
  nota_media: number | null;
  fonte_url: string | null;
  anotacao: string | null;
  site_ia_id: string | null;
  created_at: string;
};

export const ROTULO_SITUACAO: Record<SituacaoDigital, string> = {
  sem_nada: "Sem site nenhum",
  social: "Só rede social",
  site_quebrado: "Site fora do ar",
  site_antigo: "Site antigo",
  site_moderno: "Site moderno",
};

export const ROTULO_STATUS: Record<StatusProspecto, string> = {
  novo: "Novo",
  contactado: "Contactado",
  respondeu: "Respondeu",
  fechou: "Fechou 🎉",
  descartado: "Descartado",
};

// Faixas de prioridade, para o painel dizer o que fazer em vez de só mostrar
// um número.
export function faixa(pontuacao: number) {
  if (pontuacao >= 75) return { rotulo: "Ligar hoje", cor: "ok", emoji: "🟢" };
  if (pontuacao >= 50) return { rotulo: "Vale tentar", cor: "brand-2", emoji: "🟡" };
  return { rotulo: "Baixa prioridade", cor: "paper-dim", emoji: "🔴" };
}
