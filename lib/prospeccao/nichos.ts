// Catálogo de nichos: o que aparece no seletor da busca e o quanto aquele
// segmento costuma pagar — que é um dos eixos da nota de potencial.
//
// Cada nicho pertence a um GRUPO, que vira <optgroup> no seletor. A busca é
// só no Google Maps e por TEXTO, então qualquer ramo funciona — inclusive o
// digitado à mão pelo dono (ver nichoLivreValido). O catálogo existe para
// dar bons atalhos e para o ticket alimentar a nota, não para restringir.
//
// As CHAVES nunca mudam: elas estão gravadas em prospeccao.nicho_busca no
// banco de todo mundo — renomear uma chave órfã os leads dela.

export type Nicho = {
  chave: string;
  rotulo: string;
  grupo: string;
  ticket: number; // 0-100: poder de compra típico do segmento
};

export const NICHOS: Nicho[] = [
  /* ------------------------------ saúde ------------------------------ */
  { chave: "dentista", rotulo: "Dentista / Odontologia", grupo: "Saúde", ticket: 95 },
  { chave: "clinica", rotulo: "Clínica médica", grupo: "Saúde", ticket: 95 },
  { chave: "medico", rotulo: "Consultório médico", grupo: "Saúde", ticket: 90 },
  { chave: "fisioterapia", rotulo: "Fisioterapia", grupo: "Saúde", ticket: 85 },
  { chave: "psicologo", rotulo: "Psicólogo / Terapia", grupo: "Saúde", ticket: 85 },
  { chave: "nutricionista", rotulo: "Nutricionista", grupo: "Saúde", ticket: 80 },
  { chave: "farmacia", rotulo: "Farmácia / Drogaria", grupo: "Saúde", ticket: 65 },
  { chave: "laboratorio", rotulo: "Laboratório de análises", grupo: "Saúde", ticket: 80 },
  { chave: "veterinario", rotulo: "Veterinário", grupo: "Saúde", ticket: 80 },
  { chave: "plano_saude", rotulo: "Plano de saúde / Convênios", grupo: "Saúde", ticket: 85 },

  /* ----------------------- estética e beleza ------------------------- */
  { chave: "estetica", rotulo: "Estética / Beleza", grupo: "Estética e beleza", ticket: 75 },
  { chave: "clinica_estetica", rotulo: "Clínica de estética", grupo: "Estética e beleza", ticket: 85 },
  { chave: "salao", rotulo: "Salão de beleza / Cabeleireiro", grupo: "Estética e beleza", ticket: 65 },
  { chave: "barbearia", rotulo: "Barbearia", grupo: "Estética e beleza", ticket: 60 },
  { chave: "manicure", rotulo: "Manicure / Esmalteria", grupo: "Estética e beleza", ticket: 55 },
  { chave: "sobrancelha", rotulo: "Sobrancelha / Cílios", grupo: "Estética e beleza", ticket: 55 },
  { chave: "tatuagem", rotulo: "Estúdio de tatuagem", grupo: "Estética e beleza", ticket: 60 },
  { chave: "cosmeticos", rotulo: "Loja de cosméticos", grupo: "Estética e beleza", ticket: 60 },

  /* ---------------------- serviços profissionais --------------------- */
  { chave: "advogado", rotulo: "Advocacia / Escritório de advogados", grupo: "Serviços profissionais", ticket: 95 },
  { chave: "contador", rotulo: "Contabilidade", grupo: "Serviços profissionais", ticket: 85 },
  { chave: "imobiliaria", rotulo: "Imobiliária", grupo: "Serviços profissionais", ticket: 90 },
  { chave: "corretor_imoveis", rotulo: "Corretor de imóveis", grupo: "Serviços profissionais", ticket: 85 },
  { chave: "arquiteto", rotulo: "Arquitetura / Engenharia", grupo: "Serviços profissionais", ticket: 85 },
  { chave: "seguros", rotulo: "Corretora de seguros", grupo: "Serviços profissionais", ticket: 80 },
  { chave: "consultoria", rotulo: "Consultoria empresarial", grupo: "Serviços profissionais", ticket: 85 },
  { chave: "marketing", rotulo: "Agência de marketing / Publicidade", grupo: "Serviços profissionais", ticket: 80 },
  { chave: "despachante", rotulo: "Despachante", grupo: "Serviços profissionais", ticket: 65 },
  { chave: "financeira", rotulo: "Crédito / Financiamento / Consórcio", grupo: "Serviços profissionais", ticket: 80 },
  { chave: "informatica", rotulo: "TI / Informática", grupo: "Serviços profissionais", ticket: 70 },

  /* --------------------------- casa e reforma ------------------------ */
  { chave: "construcao", rotulo: "Material de construção", grupo: "Casa e reforma", ticket: 65 },
  { chave: "marcenaria", rotulo: "Marcenaria / Móveis planejados", grupo: "Casa e reforma", ticket: 75 },
  { chave: "vidracaria", rotulo: "Vidraçaria", grupo: "Casa e reforma", ticket: 60 },
  { chave: "serralheria", rotulo: "Serralheria", grupo: "Casa e reforma", ticket: 60 },
  { chave: "eletricista", rotulo: "Eletricista", grupo: "Casa e reforma", ticket: 55 },
  { chave: "encanador", rotulo: "Encanador / Hidráulica", grupo: "Casa e reforma", ticket: 55 },
  { chave: "pintor", rotulo: "Pintura / Pintor", grupo: "Casa e reforma", ticket: 55 },
  { chave: "ar_condicionado", rotulo: "Ar-condicionado / Refrigeração", grupo: "Casa e reforma", ticket: 65 },
  { chave: "dedetizadora", rotulo: "Dedetização / Controle de pragas", grupo: "Casa e reforma", ticket: 60 },
  { chave: "jardinagem", rotulo: "Jardinagem / Paisagismo", grupo: "Casa e reforma", ticket: 60 },
  { chave: "limpeza", rotulo: "Limpeza / Diarista", grupo: "Casa e reforma", ticket: 55 },
  { chave: "chaveiro", rotulo: "Chaveiro", grupo: "Casa e reforma", ticket: 50 },
  { chave: "energia_solar", rotulo: "Energia solar", grupo: "Casa e reforma", ticket: 85 },

  /* ---------------------------- automotivo --------------------------- */
  { chave: "auto", rotulo: "Oficina mecânica / Auto center", grupo: "Automotivo", ticket: 65 },
  { chave: "funilaria", rotulo: "Funilaria e pintura", grupo: "Automotivo", ticket: 60 },
  { chave: "lavajato", rotulo: "Lava-jato / Estética automotiva", grupo: "Automotivo", ticket: 55 },
  { chave: "autopecas", rotulo: "Autopeças", grupo: "Automotivo", ticket: 60 },
  { chave: "borracharia", rotulo: "Borracharia / Pneus", grupo: "Automotivo", ticket: 50 },
  { chave: "moto", rotulo: "Moto peças / Oficina de motos", grupo: "Automotivo", ticket: 55 },
  { chave: "autoescola", rotulo: "Autoescola", grupo: "Automotivo", ticket: 65 },

  /* --------------------------- alimentação --------------------------- */
  { chave: "restaurante", rotulo: "Restaurante", grupo: "Alimentação", ticket: 55 },
  { chave: "pizzaria", rotulo: "Pizzaria", grupo: "Alimentação", ticket: 50 },
  { chave: "hamburgueria", rotulo: "Hamburgueria", grupo: "Alimentação", ticket: 50 },
  { chave: "churrascaria", rotulo: "Churrascaria", grupo: "Alimentação", ticket: 60 },
  { chave: "lanchonete", rotulo: "Lanchonete / Fast food", grupo: "Alimentação", ticket: 40 },
  { chave: "cafeteria", rotulo: "Cafeteria", grupo: "Alimentação", ticket: 50 },
  { chave: "padaria", rotulo: "Padaria / Confeitaria", grupo: "Alimentação", ticket: 50 },
  { chave: "sorveteria", rotulo: "Sorveteria / Açaí", grupo: "Alimentação", ticket: 45 },
  { chave: "bar", rotulo: "Bar", grupo: "Alimentação", ticket: 45 },
  { chave: "marmitaria", rotulo: "Marmitaria / Delivery de comida", grupo: "Alimentação", ticket: 45 },
  { chave: "acougue", rotulo: "Açougue", grupo: "Alimentação", ticket: 50 },
  { chave: "hortifruti", rotulo: "Hortifruti", grupo: "Alimentação", ticket: 45 },
  { chave: "mercado", rotulo: "Mercado / Mercearia", grupo: "Alimentação", ticket: 50 },
  { chave: "bebidas", rotulo: "Distribuidora de bebidas", grupo: "Alimentação", ticket: 50 },

  /* ----------------------------- comércio ---------------------------- */
  { chave: "roupas", rotulo: "Loja de roupas", grupo: "Comércio", ticket: 60 },
  { chave: "calcados", rotulo: "Calçados", grupo: "Comércio", ticket: 55 },
  { chave: "otica", rotulo: "Ótica", grupo: "Comércio", ticket: 70 },
  { chave: "joalheria", rotulo: "Joalheria / Relojoaria", grupo: "Comércio", ticket: 70 },
  { chave: "movelaria", rotulo: "Móveis / Decoração", grupo: "Comércio", ticket: 70 },
  { chave: "celular", rotulo: "Celulares / Assistência técnica", grupo: "Comércio", ticket: 55 },
  { chave: "eletronicos", rotulo: "Eletrônicos", grupo: "Comércio", ticket: 60 },
  { chave: "petshop", rotulo: "Pet shop", grupo: "Comércio", ticket: 65 },
  { chave: "floricultura", rotulo: "Floricultura", grupo: "Comércio", ticket: 50 },
  { chave: "papelaria", rotulo: "Papelaria", grupo: "Comércio", ticket: 45 },
  { chave: "livraria", rotulo: "Livraria", grupo: "Comércio", ticket: 50 },
  { chave: "brinquedos", rotulo: "Brinquedos", grupo: "Comércio", ticket: 50 },
  { chave: "bicicletaria", rotulo: "Bicicletaria", grupo: "Comércio", ticket: 55 },
  { chave: "presentes", rotulo: "Presentes / Variedades", grupo: "Comércio", ticket: 45 },
  { chave: "suplementos", rotulo: "Suplementos", grupo: "Comércio", ticket: 55 },
  { chave: "tecidos", rotulo: "Tecidos / Armarinho", grupo: "Comércio", ticket: 45 },

  /* ------------------------ educação e fitness ----------------------- */
  { chave: "academia", rotulo: "Academia / Fitness", grupo: "Educação e fitness", ticket: 80 },
  { chave: "crossfit", rotulo: "CrossFit / Box de treino", grupo: "Educação e fitness", ticket: 75 },
  { chave: "pilates", rotulo: "Estúdio de pilates / Yoga", grupo: "Educação e fitness", ticket: 70 },
  { chave: "lutas", rotulo: "Artes marciais / Lutas", grupo: "Educação e fitness", ticket: 60 },
  { chave: "danca", rotulo: "Escola de dança", grupo: "Educação e fitness", ticket: 55 },
  { chave: "escola", rotulo: "Escola / Colégio", grupo: "Educação e fitness", ticket: 75 },
  { chave: "idiomas", rotulo: "Curso de idiomas", grupo: "Educação e fitness", ticket: 70 },
  { chave: "creche", rotulo: "Creche / Educação infantil", grupo: "Educação e fitness", ticket: 70 },
  { chave: "curso", rotulo: "Cursos livres / Profissionalizantes", grupo: "Educação e fitness", ticket: 60 },
  { chave: "musica", rotulo: "Escola de música", grupo: "Educação e fitness", ticket: 55 },

  /* ------------------------ turismo e eventos ------------------------ */
  { chave: "hotel", rotulo: "Hotel / Pousada", grupo: "Turismo e eventos", ticket: 85 },
  { chave: "agencia_viagem", rotulo: "Agência de viagens", grupo: "Turismo e eventos", ticket: 70 },
  { chave: "buffet", rotulo: "Buffet / Festas e eventos", grupo: "Turismo e eventos", ticket: 70 },
  { chave: "fotografo", rotulo: "Fotografia", grupo: "Turismo e eventos", ticket: 60 },
  { chave: "salao_festas", rotulo: "Salão de festas / Espaço de eventos", grupo: "Turismo e eventos", ticket: 65 },

  /* -------------------------- serviços gerais ------------------------ */
  { chave: "lavanderia", rotulo: "Lavanderia", grupo: "Serviços gerais", ticket: 50 },
  { chave: "costura", rotulo: "Costura / Ateliê", grupo: "Serviços gerais", ticket: 45 },
  { chave: "grafica", rotulo: "Gráfica / Comunicação visual", grupo: "Serviços gerais", ticket: 60 },
  { chave: "mudancas", rotulo: "Mudanças / Fretes", grupo: "Serviços gerais", ticket: 55 },
  { chave: "funeraria", rotulo: "Funerária", grupo: "Serviços gerais", ticket: 60 },
  { chave: "seguranca", rotulo: "Segurança / Monitoramento", grupo: "Serviços gerais", ticket: 70 },
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
