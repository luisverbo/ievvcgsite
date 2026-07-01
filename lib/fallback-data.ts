import type {
  Artista,
  Comida,
  ConfigEvento,
  FaqItemRow,
  Patrocinador,
  ProgramacaoItem,
} from "@/lib/types";

// Conteúdo da prévia aprovada (festa-das-nacoes.html), usado enquanto o
// Supabase não está configurado ou uma tabela ainda está vazia.

export const FALLBACK_CONFIG: ConfigEvento = {
  id: "fallback",
  titulo_hero: "FESTA DAS NAÇÕES",
  subtitulo_hero:
    "Uma viagem gastronômica e musical ao redor do mundo — comida típica, shows gospel ao vivo, área kids e bazar.",
  video_hero_url: null,
  texto_sobre:
    "A tradicional Festa das Nações já faz parte do calendário de muitas famílias da Zona Oeste. Mais do que uma festa, é um evento que une a igreja em um só propósito: arrecadar fundos para a expansão da obra e a propagação do evangelho.",
  data_evento: "2026-07-17T18:00:00-03:00",
  preco_ingresso: 12.5,
  link_compra: null,
  endereco: "Rua Alfredo de Morais, 589, Campo Grande, RJ",
  telefone: "(21) 98158-3331",
  email: "contato.festadasnacoes@gmail.com",
  instagram_url: null,
  facebook_url: null,
  site_url: null,
  whatsapp_numero: null,
  botao_lineup_texto: "Ver line-up",
  botao_lineup_visivel: true,
  logo_url: null,
  tema: {},
  textos: {},
  facebook_pixel_id: null,
};

export const FALLBACK_ARTISTAS: Artista[] = [
  {
    id: "1",
    nome: "Banda Cultura do Céu",
    estilo: "Louvor & Adoração",
    pais: "🇧🇷 Brasil",
    descricao:
      "Uma das bandas mais aguardadas da noite, trazendo um repertório que mistura adoração e energia pra toda a família.",
    foto_url: null,
    video_url: null,
    ordem: 1,
    ativo: true,
  },
  {
    id: "2",
    nome: "Salomão do Reggae",
    estilo: "Reggae Gospel",
    pais: "🇯🇲 Reggae",
    descricao:
      "O peso e a levada do reggae com mensagem — pra dançar, cantar e adorar do começo ao fim.",
    foto_url: null,
    video_url: null,
    ordem: 2,
    ativo: true,
  },
  {
    id: "3",
    nome: "Juliane Nogueira",
    estilo: "Voz & Ministração",
    pais: "🇧🇷 Brasil",
    descricao: "Uma voz marcante que promete um dos momentos mais emocionantes da festa.",
    foto_url: null,
    video_url: null,
    ordem: 3,
    ativo: true,
  },
  {
    id: "4",
    nome: "Kleber e Meire",
    estilo: "Dupla · Louvor",
    pais: "🇧🇷 Brasil",
    descricao: "Harmonia e ministração pra fechar a programação musical com chave de ouro.",
    foto_url: null,
    video_url: null,
    ordem: 4,
    ativo: true,
  },
];

const DIAS = ["Sexta · 17 jul", "Sábado · 18 jul"] as const;
const ITENS_DIA = [
  { horario: "18h", descricao: "Abertura dos portões e stands" },
  { horario: "19h", descricao: "Atração musical" },
  { horario: "21h", descricao: "Sorteios do passaporte" },
  { horario: "22h", descricao: "Show principal" },
  { horario: "00h", descricao: "Encerramento" },
];

export const FALLBACK_PROGRAMACAO: ProgramacaoItem[] = DIAS.flatMap((dia, diaIndex) =>
  ITENS_DIA.map((item, i) => ({
    id: `${diaIndex}-${i}`,
    dia,
    horario: item.horario,
    descricao: item.descricao,
    ordem: i + 1,
  })),
);

export const FALLBACK_COMIDAS: Comida[] = [
  { id: "1", pais: "Alemanha", prato: "Pernil", emoji: "🥨", ordem: 1 },
  { id: "2", pais: "Argentina", prato: "Churrasco", emoji: "🥩", ordem: 2 },
  { id: "3", pais: "EUA", prato: "Burger", emoji: "🍔", ordem: 3 },
  { id: "4", pais: "Itália", prato: "Massas", emoji: "🍝", ordem: 4 },
  { id: "5", pais: "Austrália", prato: "BBQ", emoji: "🍖", ordem: 5 },
  { id: "6", pais: "+11 países", prato: "e mais", emoji: "🌎", ordem: 6 },
];

export const FALLBACK_FAQ: FaqItemRow[] = [
  {
    id: "1",
    pergunta: "Quando e onde será?",
    resposta:
      "17 e 18 de julho, das 18h à 00h, no Espaço de Eventos Verbo Campo Grande — Rua Alfredo de Morais, 589, Campo Grande, RJ.",
    ordem: 1,
  },
  {
    id: "2",
    pergunta: "Como funciona o ingresso?",
    resposta:
      "É seu passe livre para os shows e stands. Válido para 1 dia de festa. Crianças até 3 anos não pagam. Não é necessário para o bazar.",
    ordem: 2,
  },
  {
    id: "3",
    pergunta: "Como é o pagamento na festa?",
    resposta:
      'Na Casa de Câmbio você compra tickets de consumação — é o "dinheiro" da festa para comida, bebida e brinquedos. Sobrou? Troque de volta até 00h.',
    ordem: 3,
  },
  {
    id: "4",
    pergunta: "O que é o passaporte?",
    resposta:
      "Sua porta de entrada para os sorteios. Prove as comidas, colecione 8 selos diferentes, preencha com nome + telefone e devolva na Casa de Câmbio.",
    ordem: 4,
  },
  {
    id: "5",
    pergunta: "Posso ser patrocinador?",
    resposta: "Sim! Escreva para contato.festadasnacoes@gmail.com e solicite nosso Mídia Kit.",
    ordem: 5,
  },
];

export const FALLBACK_GALERIA: string[] = [
  "linear-gradient(150deg,#EF5B43,#7a2418)",
  "linear-gradient(150deg,#37B08A,#123f30)",
  "linear-gradient(150deg,#F4A62A,#7a5310)",
  "linear-gradient(150deg,#EA5C93,#6e2144)",
  "linear-gradient(150deg,#9D6BE0,#3d2569)",
  "linear-gradient(150deg,#37B08A,#123f30)",
  "linear-gradient(150deg,#EF5B43,#7a2418)",
  "linear-gradient(150deg,#F4A62A,#7a5310)",
];

export const FALLBACK_PATROCINADORES: Patrocinador[] = Array.from({ length: 5 }).map(
  (_, i) => ({
    id: String(i),
    nome: "Sua marca",
    logo_url: null,
    link_url: null,
    ordem: i + 1,
  }),
);

const ARTISTA_GRADIENTS = [
  "linear-gradient(150deg,#EF5B43,#3a0f0a)",
  "linear-gradient(150deg,#37B08A,#0d3327)",
  "linear-gradient(150deg,#F4A62A,#5c3d0b)",
  "linear-gradient(150deg,#EA5C93,#4d1631)",
];

export function artistaGradient(index: number) {
  return ARTISTA_GRADIENTS[index % ARTISTA_GRADIENTS.length];
}
