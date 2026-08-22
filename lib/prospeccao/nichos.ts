// Catálogo de nichos: traduz o que você digita ("dentista") para as etiquetas
// do OpenStreetMap, e guarda o quanto aquele segmento costuma pagar — que é um
// dos eixos da nota de potencial.
//
// Cada nicho pertence a um GRUPO (vira <optgroup> no seletor) e pode ou não
// ter filtros do OSM:
//   - com filtros  → funciona nas duas buscas (OSM e Google);
//   - filtros: []  → só Google. O OSM precisa de etiqueta mapeada; o Google
//                    busca por texto e acha qualquer coisa ("clínica de
//                    estética em Copacabana" funciona sem etiqueta nenhuma).
//
// As CHAVES antigas não mudam nunca: elas estão gravadas em prospeccao.
// nicho_busca no banco de todo mundo — renomear uma chave órfã os leads dela.

export type Nicho = {
  chave: string;
  rotulo: string;
  grupo: string;
  filtros: string[]; // trechos de filtro Overpass; vazio = só busca no Google
  ticket: number; // 0-100: poder de compra típico do segmento
};

export const NICHOS: Nicho[] = [
  /* ------------------------------ saúde ------------------------------ */
  { chave: "dentista", rotulo: "Dentista / Odontologia", grupo: "Saúde", filtros: ['["amenity"="dentist"]', '["healthcare"="dentist"]'], ticket: 95 },
  { chave: "clinica", rotulo: "Clínica médica", grupo: "Saúde", filtros: ['["amenity"="clinic"]', '["healthcare"="clinic"]'], ticket: 95 },
  { chave: "medico", rotulo: "Consultório médico", grupo: "Saúde", filtros: ['["amenity"="doctors"]', '["healthcare"="doctor"]'], ticket: 90 },
  { chave: "fisioterapia", rotulo: "Fisioterapia", grupo: "Saúde", filtros: ['["healthcare"="physiotherapist"]'], ticket: 85 },
  { chave: "psicologo", rotulo: "Psicólogo / Terapia", grupo: "Saúde", filtros: ['["healthcare"="psychotherapist"]', '["healthcare:speciality"="psychiatry"]'], ticket: 85 },
  { chave: "nutricionista", rotulo: "Nutricionista", grupo: "Saúde", filtros: ['["healthcare"="dietitian"]'], ticket: 80 },
  { chave: "farmacia", rotulo: "Farmácia / Drogaria", grupo: "Saúde", filtros: ['["amenity"="pharmacy"]'], ticket: 65 },
  { chave: "laboratorio", rotulo: "Laboratório de análises", grupo: "Saúde", filtros: ['["healthcare"="laboratory"]'], ticket: 80 },
  { chave: "veterinario", rotulo: "Veterinário", grupo: "Saúde", filtros: ['["amenity"="veterinary"]'], ticket: 80 },
  { chave: "plano_saude", rotulo: "Plano de saúde / Convênios", grupo: "Saúde", filtros: [], ticket: 85 },

  /* ----------------------- estética e beleza ------------------------- */
  { chave: "estetica", rotulo: "Estética / Beleza", grupo: "Estética e beleza", filtros: ['["shop"="beauty"]', '["shop"="hairdresser"]'], ticket: 75 },
  { chave: "clinica_estetica", rotulo: "Clínica de estética", grupo: "Estética e beleza", filtros: [], ticket: 85 },
  { chave: "salao", rotulo: "Salão de beleza / Cabeleireiro", grupo: "Estética e beleza", filtros: ['["shop"="hairdresser"]'], ticket: 65 },
  { chave: "barbearia", rotulo: "Barbearia", grupo: "Estética e beleza", filtros: ['["shop"="hairdresser"]'], ticket: 60 },
  { chave: "manicure", rotulo: "Manicure / Esmalteria", grupo: "Estética e beleza", filtros: ['["shop"="beauty"]["beauty"="nails"]'], ticket: 55 },
  { chave: "sobrancelha", rotulo: "Sobrancelha / Cílios", grupo: "Estética e beleza", filtros: [], ticket: 55 },
  { chave: "tatuagem", rotulo: "Estúdio de tatuagem", grupo: "Estética e beleza", filtros: ['["shop"="tattoo"]'], ticket: 60 },
  { chave: "cosmeticos", rotulo: "Loja de cosméticos", grupo: "Estética e beleza", filtros: ['["shop"="cosmetics"]'], ticket: 60 },

  /* ---------------------- serviços profissionais --------------------- */
  { chave: "advogado", rotulo: "Advocacia / Escritório de advogados", grupo: "Serviços profissionais", filtros: ['["office"="lawyer"]'], ticket: 95 },
  { chave: "contador", rotulo: "Contabilidade", grupo: "Serviços profissionais", filtros: ['["office"="accountant"]'], ticket: 85 },
  { chave: "imobiliaria", rotulo: "Imobiliária", grupo: "Serviços profissionais", filtros: ['["office"="estate_agent"]'], ticket: 90 },
  { chave: "corretor_imoveis", rotulo: "Corretor de imóveis", grupo: "Serviços profissionais", filtros: [], ticket: 85 },
  { chave: "arquiteto", rotulo: "Arquitetura / Engenharia", grupo: "Serviços profissionais", filtros: ['["office"="architect"]', '["office"="engineer"]'], ticket: 85 },
  { chave: "seguros", rotulo: "Corretora de seguros", grupo: "Serviços profissionais", filtros: ['["office"="insurance"]'], ticket: 80 },
  { chave: "consultoria", rotulo: "Consultoria empresarial", grupo: "Serviços profissionais", filtros: ['["office"="consulting"]'], ticket: 85 },
  { chave: "marketing", rotulo: "Agência de marketing / Publicidade", grupo: "Serviços profissionais", filtros: ['["office"="advertising_agency"]'], ticket: 80 },
  { chave: "despachante", rotulo: "Despachante", grupo: "Serviços profissionais", filtros: [], ticket: 65 },
  { chave: "financeira", rotulo: "Crédito / Financiamento / Consórcio", grupo: "Serviços profissionais", filtros: ['["office"="financial"]'], ticket: 80 },
  { chave: "informatica", rotulo: "TI / Informática", grupo: "Serviços profissionais", filtros: ['["shop"="computer"]'], ticket: 70 },

  /* --------------------------- casa e reforma ------------------------ */
  { chave: "construcao", rotulo: "Material de construção", grupo: "Casa e reforma", filtros: ['["shop"="doityourself"]', '["shop"="hardware"]'], ticket: 65 },
  { chave: "marcenaria", rotulo: "Marcenaria / Móveis planejados", grupo: "Casa e reforma", filtros: ['["craft"="carpenter"]'], ticket: 75 },
  { chave: "vidracaria", rotulo: "Vidraçaria", grupo: "Casa e reforma", filtros: ['["craft"="glaziery"]'], ticket: 60 },
  { chave: "serralheria", rotulo: "Serralheria", grupo: "Casa e reforma", filtros: ['["craft"="metal_construction"]'], ticket: 60 },
  { chave: "eletricista", rotulo: "Eletricista", grupo: "Casa e reforma", filtros: ['["craft"="electrician"]'], ticket: 55 },
  { chave: "encanador", rotulo: "Encanador / Hidráulica", grupo: "Casa e reforma", filtros: ['["craft"="plumber"]'], ticket: 55 },
  { chave: "pintor", rotulo: "Pintura / Pintor", grupo: "Casa e reforma", filtros: ['["craft"="painter"]'], ticket: 55 },
  { chave: "ar_condicionado", rotulo: "Ar-condicionado / Refrigeração", grupo: "Casa e reforma", filtros: ['["craft"="hvac"]'], ticket: 65 },
  { chave: "dedetizadora", rotulo: "Dedetização / Controle de pragas", grupo: "Casa e reforma", filtros: [], ticket: 60 },
  { chave: "jardinagem", rotulo: "Jardinagem / Paisagismo", grupo: "Casa e reforma", filtros: ['["craft"="gardener"]'], ticket: 60 },
  { chave: "limpeza", rotulo: "Limpeza / Diarista", grupo: "Casa e reforma", filtros: [], ticket: 55 },
  { chave: "chaveiro", rotulo: "Chaveiro", grupo: "Casa e reforma", filtros: ['["craft"="locksmith"]', '["shop"="locksmith"]'], ticket: 50 },
  { chave: "energia_solar", rotulo: "Energia solar", grupo: "Casa e reforma", filtros: [], ticket: 85 },

  /* ---------------------------- automotivo --------------------------- */
  { chave: "auto", rotulo: "Oficina mecânica / Auto center", grupo: "Automotivo", filtros: ['["shop"="car_repair"]', '["shop"="car"]'], ticket: 65 },
  { chave: "funilaria", rotulo: "Funilaria e pintura", grupo: "Automotivo", filtros: [], ticket: 60 },
  { chave: "lavajato", rotulo: "Lava-jato / Estética automotiva", grupo: "Automotivo", filtros: ['["amenity"="car_wash"]'], ticket: 55 },
  { chave: "autopecas", rotulo: "Autopeças", grupo: "Automotivo", filtros: ['["shop"="car_parts"]'], ticket: 60 },
  { chave: "borracharia", rotulo: "Borracharia / Pneus", grupo: "Automotivo", filtros: ['["shop"="tyres"]'], ticket: 50 },
  { chave: "moto", rotulo: "Moto peças / Oficina de motos", grupo: "Automotivo", filtros: ['["shop"="motorcycle"]'], ticket: 55 },
  { chave: "autoescola", rotulo: "Autoescola", grupo: "Automotivo", filtros: ['["amenity"="driving_school"]'], ticket: 65 },

  /* --------------------------- alimentação --------------------------- */
  { chave: "restaurante", rotulo: "Restaurante", grupo: "Alimentação", filtros: ['["amenity"="restaurant"]'], ticket: 55 },
  { chave: "pizzaria", rotulo: "Pizzaria", grupo: "Alimentação", filtros: ['["cuisine"="pizza"]'], ticket: 50 },
  { chave: "hamburgueria", rotulo: "Hamburgueria", grupo: "Alimentação", filtros: ['["cuisine"="burger"]'], ticket: 50 },
  { chave: "churrascaria", rotulo: "Churrascaria", grupo: "Alimentação", filtros: [], ticket: 60 },
  { chave: "lanchonete", rotulo: "Lanchonete / Fast food", grupo: "Alimentação", filtros: ['["amenity"="fast_food"]'], ticket: 40 },
  { chave: "cafeteria", rotulo: "Cafeteria", grupo: "Alimentação", filtros: ['["amenity"="cafe"]'], ticket: 50 },
  { chave: "padaria", rotulo: "Padaria / Confeitaria", grupo: "Alimentação", filtros: ['["shop"="bakery"]', '["shop"="pastry"]', '["shop"="confectionery"]'], ticket: 50 },
  { chave: "sorveteria", rotulo: "Sorveteria / Açaí", grupo: "Alimentação", filtros: ['["amenity"="ice_cream"]'], ticket: 45 },
  { chave: "bar", rotulo: "Bar", grupo: "Alimentação", filtros: ['["amenity"="bar"]', '["amenity"="pub"]'], ticket: 45 },
  { chave: "marmitaria", rotulo: "Marmitaria / Delivery de comida", grupo: "Alimentação", filtros: [], ticket: 45 },
  { chave: "acougue", rotulo: "Açougue", grupo: "Alimentação", filtros: ['["shop"="butcher"]'], ticket: 50 },
  { chave: "hortifruti", rotulo: "Hortifruti", grupo: "Alimentação", filtros: ['["shop"="greengrocer"]'], ticket: 45 },
  { chave: "mercado", rotulo: "Mercado / Mercearia", grupo: "Alimentação", filtros: ['["shop"="supermarket"]', '["shop"="convenience"]'], ticket: 50 },
  { chave: "bebidas", rotulo: "Distribuidora de bebidas", grupo: "Alimentação", filtros: ['["shop"="beverages"]'], ticket: 50 },

  /* ----------------------------- comércio ---------------------------- */
  { chave: "roupas", rotulo: "Loja de roupas", grupo: "Comércio", filtros: ['["shop"="clothes"]', '["shop"="boutique"]'], ticket: 60 },
  { chave: "calcados", rotulo: "Calçados", grupo: "Comércio", filtros: ['["shop"="shoes"]'], ticket: 55 },
  { chave: "otica", rotulo: "Ótica", grupo: "Comércio", filtros: ['["shop"="optician"]'], ticket: 70 },
  { chave: "joalheria", rotulo: "Joalheria / Relojoaria", grupo: "Comércio", filtros: ['["shop"="jewelry"]'], ticket: 70 },
  { chave: "movelaria", rotulo: "Móveis / Decoração", grupo: "Comércio", filtros: ['["shop"="furniture"]', '["shop"="interior_decoration"]'], ticket: 70 },
  { chave: "celular", rotulo: "Celulares / Assistência técnica", grupo: "Comércio", filtros: ['["shop"="mobile_phone"]'], ticket: 55 },
  { chave: "eletronicos", rotulo: "Eletrônicos", grupo: "Comércio", filtros: ['["shop"="electronics"]'], ticket: 60 },
  { chave: "petshop", rotulo: "Pet shop", grupo: "Comércio", filtros: ['["shop"="pet"]'], ticket: 65 },
  { chave: "floricultura", rotulo: "Floricultura", grupo: "Comércio", filtros: ['["shop"="florist"]'], ticket: 50 },
  { chave: "papelaria", rotulo: "Papelaria", grupo: "Comércio", filtros: ['["shop"="stationery"]'], ticket: 45 },
  { chave: "livraria", rotulo: "Livraria", grupo: "Comércio", filtros: ['["shop"="books"]'], ticket: 50 },
  { chave: "brinquedos", rotulo: "Brinquedos", grupo: "Comércio", filtros: ['["shop"="toys"]'], ticket: 50 },
  { chave: "bicicletaria", rotulo: "Bicicletaria", grupo: "Comércio", filtros: ['["shop"="bicycle"]'], ticket: 55 },
  { chave: "presentes", rotulo: "Presentes / Variedades", grupo: "Comércio", filtros: ['["shop"="gift"]'], ticket: 45 },
  { chave: "suplementos", rotulo: "Suplementos", grupo: "Comércio", filtros: ['["shop"="nutrition_supplements"]'], ticket: 55 },
  { chave: "tecidos", rotulo: "Tecidos / Armarinho", grupo: "Comércio", filtros: ['["shop"="fabric"]'], ticket: 45 },

  /* ------------------------ educação e fitness ----------------------- */
  { chave: "academia", rotulo: "Academia / Fitness", grupo: "Educação e fitness", filtros: ['["leisure"="fitness_centre"]'], ticket: 80 },
  { chave: "crossfit", rotulo: "CrossFit / Box de treino", grupo: "Educação e fitness", filtros: [], ticket: 75 },
  { chave: "pilates", rotulo: "Estúdio de pilates / Yoga", grupo: "Educação e fitness", filtros: [], ticket: 70 },
  { chave: "lutas", rotulo: "Artes marciais / Lutas", grupo: "Educação e fitness", filtros: [], ticket: 60 },
  { chave: "danca", rotulo: "Escola de dança", grupo: "Educação e fitness", filtros: ['["leisure"="dance"]'], ticket: 55 },
  { chave: "escola", rotulo: "Escola / Colégio", grupo: "Educação e fitness", filtros: ['["amenity"="school"]'], ticket: 75 },
  { chave: "idiomas", rotulo: "Curso de idiomas", grupo: "Educação e fitness", filtros: ['["amenity"="language_school"]'], ticket: 70 },
  { chave: "creche", rotulo: "Creche / Educação infantil", grupo: "Educação e fitness", filtros: ['["amenity"="kindergarten"]'], ticket: 70 },
  { chave: "curso", rotulo: "Cursos livres / Profissionalizantes", grupo: "Educação e fitness", filtros: [], ticket: 60 },
  { chave: "musica", rotulo: "Escola de música", grupo: "Educação e fitness", filtros: ['["amenity"="music_school"]'], ticket: 55 },

  /* ------------------------ turismo e eventos ------------------------ */
  { chave: "hotel", rotulo: "Hotel / Pousada", grupo: "Turismo e eventos", filtros: ['["tourism"="hotel"]', '["tourism"="guest_house"]'], ticket: 85 },
  { chave: "agencia_viagem", rotulo: "Agência de viagens", grupo: "Turismo e eventos", filtros: ['["shop"="travel_agency"]'], ticket: 70 },
  { chave: "buffet", rotulo: "Buffet / Festas e eventos", grupo: "Turismo e eventos", filtros: [], ticket: 70 },
  { chave: "fotografo", rotulo: "Fotografia", grupo: "Turismo e eventos", filtros: ['["craft"="photographer"]', '["shop"="photo"]'], ticket: 60 },
  { chave: "salao_festas", rotulo: "Salão de festas / Espaço de eventos", grupo: "Turismo e eventos", filtros: [], ticket: 65 },

  /* -------------------------- serviços gerais ------------------------ */
  { chave: "lavanderia", rotulo: "Lavanderia", grupo: "Serviços gerais", filtros: ['["shop"="laundry"]', '["shop"="dry_cleaning"]'], ticket: 50 },
  { chave: "costura", rotulo: "Costura / Ateliê", grupo: "Serviços gerais", filtros: ['["craft"="tailor"]', '["shop"="tailor"]'], ticket: 45 },
  { chave: "grafica", rotulo: "Gráfica / Comunicação visual", grupo: "Serviços gerais", filtros: ['["shop"="copyshop"]', '["craft"="printer"]'], ticket: 60 },
  { chave: "mudancas", rotulo: "Mudanças / Fretes", grupo: "Serviços gerais", filtros: [], ticket: 55 },
  { chave: "funeraria", rotulo: "Funerária", grupo: "Serviços gerais", filtros: ['["shop"="funeral_directors"]'], ticket: 60 },
  { chave: "seguranca", rotulo: "Segurança / Monitoramento", grupo: "Serviços gerais", filtros: [], ticket: 70 },
];

// A ordem dos grupos no seletor — a ordem de descoberta, não a alfabética.
export const GRUPOS_NICHOS = [
  "Saúde",
  "Estética e beleza",
  "Serviços profissionais",
  "Casa e reforma",
  "Automotivo",
  "Alimentação",
  "Comércio",
  "Educação e fitness",
  "Turismo e eventos",
  "Serviços gerais",
];

export function acharNicho(chave: string): Nicho | undefined {
  return NICHOS.find((n) => n.chave === chave);
}

// Poder de compra do segmento (eixo da nota). Nicho desconhecido fica no meio.
export function ticketDoNicho(chave: string | null | undefined): number {
  return acharNicho(chave ?? "")?.ticket ?? 60;
}

/*
 * Nicho digitado à mão ("outro"): qualquer texto vira busca no Google Maps —
 * o Google acha "loja de aquário" sem precisar de etiqueta nenhuma. Só é
 * recusado o que não daria uma busca: curto demais, longo demais, ou com
 * caracteres que não existem em nome de ramo.
 */
export function nichoLivreValido(texto: string): boolean {
  const t = texto.trim();
  return t.length >= 3 && t.length <= 60 && /^[\p{L}\p{N} .,&'-]+$/u.test(t);
}

// O que a busca do Google digita no Maps para este nicho (chave do catálogo
// ou texto livre). Centralizado para painel e agente montarem o MESMO termo.
export function termoDeBusca(nicho: string): string {
  const doCatalogo = acharNicho(nicho);
  return doCatalogo ? doCatalogo.rotulo.split("/")[0].trim() : nicho.trim();
}
