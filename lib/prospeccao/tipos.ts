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
  ig_nome: string | null;
  ig_bio: string | null;
  ig_seguidores: number | null;
  ig_fotos: { url: string; legenda?: string }[];
  ig_status: "ok" | "privado" | "nao_encontrado" | "bloqueado" | "erro" | null;
  ig_erro: string | null;
  ig_capturado_em: string | null;
  anotacao: string | null;
  // Etiqueta livre de quem vende ("quente", "ligar sexta"). Opcional —
  // coluna de migração nova, pode não existir ainda.
  etiqueta?: string | null;
  // "Me lembra dia X": no dia, o lead sobe para o topo com o selo ⏰.
  lembrete_em?: string | null;
  site_ia_id: string | null;
  // Link único do lead (/p/codigo) — Termômetro e Espelho penduram nele.
  link_codigo?: string | null;
  // Print do site ATUAL do lead, para a comparação "hoje × amanhã".
  espelho_url?: string | null;
  espelho_em?: string | null;
  // Opt-out definitivo: pediu para não receber mais nada. Nenhuma fila passa.
  nao_perturbar: boolean;
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
/*
 * `classe` vem escrita por extenso ("text-ok"), nunca montada como
 * `text-${cor}`: o Tailwind só gera classes que encontra literais no código.
 * As montadas em runtime funcionavam por coincidência — outra tela usava o
 * mesmo nome — e quebrariam em silêncio no dia em que essa outra tela mudasse.
 */
export function faixa(pontuacao: number) {
  if (pontuacao >= 75)
    return { rotulo: "Ligar hoje", cor: "ok", classe: "text-ok", barra: "#2fbf8f", emoji: "🟢" };
  if (pontuacao >= 50)
    return { rotulo: "Vale tentar", cor: "brand-2", classe: "text-brand-2", barra: "#8e7bff", emoji: "🟡" };
  return {
    rotulo: "Baixa prioridade",
    cor: "paper-dim",
    classe: "text-paper-dim",
    barra: "#a6adbd",
    emoji: "🔴",
  };
}

/* -------------------------- fila de tarefas do agente --------------------- */
export type StatusTarefa = "pendente" | "rodando" | "concluida" | "erro" | "cancelada";

export type TarefaRow = {
  id: string;
  tipo?: string;
  nicho: string | null;
  local: string | null;
  limite: number;
  status: StatusTarefa;
  progresso: number;
  total: number;
  gravadas: number;
  erro: string | null;
  agente: string | null;
  created_at: string;
  /* Filtros pedidos na busca. Ausente antes da migração 2026-08-24. */
  filtros?: unknown;
};

export const ROTULO_TAREFA: Record<StatusTarefa, string> = {
  pendente: "Na fila",
  rodando: "Buscando…",
  concluida: "Concluída",
  erro: "Falhou",
  cancelada: "Cancelada",
};
