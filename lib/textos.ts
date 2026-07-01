// Todos os textos "fixos" do site ficam aqui como padrão. O painel
// (admin → Textos) grava sobrescritas no jsonb config_evento.textos, então
// qualquer texto da landing pode ser editado sem mexer no código.

export const TEXTOS_PADRAO: Record<string, string> = {
  // Hero
  hero_badge: "🌎 11ª edição · Igreja Verbo da Vida CG",
  hero_metricas: "6 continentes · 16 países · 2 dias de festa",
  hero_horario: "18h—00h",
  hero_horario_label: "dois dias",
  hero_cta_garantir: "Garantir ingresso",

  // Sobre
  sobre_eyebrow: "Sobre a festa",
  sobre_titulo: "Toda a igreja,\num só propósito",
  sobre_lead:
    "Em 2 dias, os 6 continentes ganham vida em mais de 16 stands — com comidas típicas, sorteios, atrações musicais e um grande bazar.",

  // Line-up
  lineup_eyebrow: "Atrações musicais",
  lineup_titulo: "Line-up 2026",
  lineup_desc:
    "Os artistas confirmados para os dois dias de festa. Toque no play para assistir ao vídeo de cada um.",

  // Programação
  programacao_eyebrow: "Programação",
  programacao_titulo: "Dois dias de festa",

  // Comidas
  comidas_eyebrow: "Comidas típicas",
  comidas_titulo: "Uma volta ao mundo\nem cada mordida",
  comidas_desc:
    "Sanduíche de pernil da Alemanha ou costelinha barbecue da Austrália — impossível provar e não se apaixonar.",

  // Destaques (3 cards)
  destaque1_emoji: "🎠",
  destaque1_titulo: "Área Kids",
  destaque1_texto:
    "Pescaria, ônibus da alegria e muitos brinquedos pra criançada gastar energia com segurança.",
  destaque2_emoji: "🛍️",
  destaque2_titulo: "Bazar & Sorteios",
  destaque2_texto:
    "Roupas em bom estado no precinho e prêmios incríveis sorteados durante toda a festa.",
  destaque3_emoji: "🛂",
  destaque3_titulo: "O Passaporte",
  destaque3_texto:
    "Colecione 8 selos provando as comidas, preencha e concorra a prêmios na Casa de Câmbio.",

  // Local
  local_eyebrow: "Local amplo e seguro",
  local_titulo: "Pode ficar tranquilo,\ncuidamos de tudo",
  local_nome: "Espaço de Eventos Verbo CG",
  local_itens:
    "Saídas de emergência sinalizadas\nEquipe de segurança em todo o evento\nAmbulância do Corpo de Bombeiros de plantão\nEstrutura para até 5.000 pessoas com conforto\nEstacionamentos particulares próximos",

  // Galeria
  galeria_eyebrow: "Edições anteriores",
  galeria_titulo: "Quem vem, se apaixona",

  // Ingresso
  ingresso_eyebrow: "Garanta o seu",
  ingresso_preco_sufixo: "/ por dia",
  ingresso_cta: "Comprar ingresso online",
  ingresso_aviso: "Crianças até 3 anos não pagam · Compre antes e evite filas na bilheteria",

  // FAQ
  faq_eyebrow: "Dúvidas frequentes",
  faq_titulo: "Antes de embarcar",

  // Testemunho
  testemunho_texto: "Quem vem, se apaixona…",
  testemunho_autor: "— visitante da 10ª edição",

  // Patrocinadores
  patrocinadores_eyebrow: "Patrocinadores",
  patrocinadores_titulo: "Quem faz a festa acontecer",

  // Footer
  footer_desc: "Igreja Verbo da Vida Campo Grande",
};

// Retorna a sobrescrita do painel ou o padrão.
export function txt(textos: Record<string, string> | undefined, key: string): string {
  const custom = textos?.[key];
  return custom !== undefined && custom !== "" ? custom : (TEXTOS_PADRAO[key] ?? "");
}

type CampoTexto = { key: string; label: string; multiline?: boolean };
type GrupoTexto = { grupo: string; campos: CampoTexto[] };

// Estrutura usada para montar o formulário no painel.
export const TEXTOS_GRUPOS: GrupoTexto[] = [
  {
    grupo: "Topo (Hero)",
    campos: [
      { key: "hero_badge", label: "Selo acima do título" },
      { key: "hero_metricas", label: "Linha dourada (6 continentes · …)" },
      { key: "hero_horario", label: "Horário (caixa do meio)" },
      { key: "hero_horario_label", label: "Legenda do horário" },
      { key: "hero_cta_garantir", label: "Botão principal" },
    ],
  },
  {
    grupo: "Sobre a festa",
    campos: [
      { key: "sobre_eyebrow", label: "Rótulo" },
      { key: "sobre_titulo", label: "Título", multiline: true },
      { key: "sobre_lead", label: "Frase de destaque", multiline: true },
      { key: "_texto_sobre", label: "Parágrafo principal", multiline: true },
    ],
  },
  {
    grupo: "Line-up",
    campos: [
      { key: "lineup_eyebrow", label: "Rótulo" },
      { key: "lineup_titulo", label: "Título" },
      { key: "lineup_desc", label: "Descrição", multiline: true },
    ],
  },
  {
    grupo: "Programação",
    campos: [
      { key: "programacao_eyebrow", label: "Rótulo" },
      { key: "programacao_titulo", label: "Título" },
    ],
  },
  {
    grupo: "Comidas",
    campos: [
      { key: "comidas_eyebrow", label: "Rótulo" },
      { key: "comidas_titulo", label: "Título", multiline: true },
      { key: "comidas_desc", label: "Descrição", multiline: true },
    ],
  },
  {
    grupo: "Destaques — Card 1",
    campos: [
      { key: "destaque1_emoji", label: "Emoji" },
      { key: "destaque1_titulo", label: "Título" },
      { key: "destaque1_texto", label: "Texto", multiline: true },
    ],
  },
  {
    grupo: "Destaques — Card 2",
    campos: [
      { key: "destaque2_emoji", label: "Emoji" },
      { key: "destaque2_titulo", label: "Título" },
      { key: "destaque2_texto", label: "Texto", multiline: true },
    ],
  },
  {
    grupo: "Destaques — Card 3",
    campos: [
      { key: "destaque3_emoji", label: "Emoji" },
      { key: "destaque3_titulo", label: "Título" },
      { key: "destaque3_texto", label: "Texto", multiline: true },
    ],
  },
  {
    grupo: "Local",
    campos: [
      { key: "local_eyebrow", label: "Rótulo" },
      { key: "local_titulo", label: "Título", multiline: true },
      { key: "local_nome", label: "Nome do local (antes do endereço)" },
      { key: "_endereco", label: "Endereço completo" },
      { key: "local_itens", label: "Itens de segurança (um por linha)", multiline: true },
    ],
  },
  {
    grupo: "Galeria",
    campos: [
      { key: "galeria_eyebrow", label: "Rótulo" },
      { key: "galeria_titulo", label: "Título" },
    ],
  },
  {
    grupo: "Ingresso",
    campos: [
      { key: "ingresso_eyebrow", label: "Rótulo" },
      { key: "ingresso_preco_sufixo", label: "Sufixo do preço" },
      { key: "ingresso_cta", label: "Botão de compra" },
      { key: "ingresso_aviso", label: "Aviso abaixo do botão", multiline: true },
    ],
  },
  {
    grupo: "FAQ",
    campos: [
      { key: "faq_eyebrow", label: "Rótulo" },
      { key: "faq_titulo", label: "Título" },
    ],
  },
  {
    grupo: "Depoimento",
    campos: [
      { key: "testemunho_texto", label: "Frase" },
      { key: "testemunho_autor", label: "Autor" },
    ],
  },
  {
    grupo: "Patrocinadores",
    campos: [
      { key: "patrocinadores_eyebrow", label: "Rótulo" },
      { key: "patrocinadores_titulo", label: "Título" },
    ],
  },
  {
    grupo: "Rodapé",
    campos: [{ key: "footer_desc", label: "Texto do rodapé", multiline: true }],
  },
];
