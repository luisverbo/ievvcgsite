// Catálogo de nichos: traduz o que você digita ("dentista") para as etiquetas
// do OpenStreetMap, e guarda o quanto aquele segmento costuma pagar por um
// site — que é um dos eixos da nota de potencial.

export type Nicho = {
  chave: string;
  rotulo: string;
  filtros: string[]; // trechos de filtro Overpass
  ticket: number; // 0-100: poder de compra típico do segmento
};

export const NICHOS: Nicho[] = [
  // ---- saúde e estética: ticket alto, dependem de reputação ----
  { chave: "dentista", rotulo: "Dentista / Odontologia", filtros: ['["amenity"="dentist"]', '["healthcare"="dentist"]'], ticket: 95 },
  { chave: "clinica", rotulo: "Clínica médica", filtros: ['["amenity"="clinic"]', '["healthcare"="clinic"]'], ticket: 95 },
  { chave: "medico", rotulo: "Consultório médico", filtros: ['["amenity"="doctors"]', '["healthcare"="doctor"]'], ticket: 90 },
  { chave: "veterinario", rotulo: "Veterinário / Pet", filtros: ['["amenity"="veterinary"]', '["shop"="pet"]'], ticket: 80 },
  { chave: "estetica", rotulo: "Estética / Beleza", filtros: ['["shop"="beauty"]', '["shop"="hairdresser"]'], ticket: 75 },
  { chave: "fisioterapia", rotulo: "Fisioterapia", filtros: ['["healthcare"="physiotherapist"]'], ticket: 85 },
  { chave: "psicologo", rotulo: "Psicólogo / Terapia", filtros: ['["healthcare"="psychotherapist"]', '["healthcare:speciality"="psychiatry"]'], ticket: 85 },

  // ---- serviços profissionais ----
  { chave: "advogado", rotulo: "Advogado / Escritório", filtros: ['["office"="lawyer"]'], ticket: 95 },
  { chave: "contador", rotulo: "Contador", filtros: ['["office"="accountant"]'], ticket: 85 },
  { chave: "imobiliaria", rotulo: "Imobiliária", filtros: ['["office"="estate_agent"]'], ticket: 90 },
  { chave: "arquiteto", rotulo: "Arquiteto / Engenharia", filtros: ['["office"="architect"]', '["office"="engineer"]'], ticket: 85 },
  { chave: "seguros", rotulo: "Seguros", filtros: ['["office"="insurance"]'], ticket: 80 },

  // ---- educação e fitness ----
  { chave: "academia", rotulo: "Academia / Fitness", filtros: ['["leisure"="fitness_centre"]'], ticket: 80 },
  { chave: "escola", rotulo: "Escola / Curso", filtros: ['["amenity"="school"]', '["amenity"="language_school"]', '["amenity"="driving_school"]'], ticket: 75 },

  // ---- alimentação: ticket menor, volume alto ----
  { chave: "restaurante", rotulo: "Restaurante", filtros: ['["amenity"="restaurant"]'], ticket: 55 },
  { chave: "cafeteria", rotulo: "Cafeteria", filtros: ['["amenity"="cafe"]'], ticket: 50 },
  { chave: "padaria", rotulo: "Padaria / Confeitaria", filtros: ['["shop"="bakery"]', '["shop"="pastry"]', '["shop"="confectionery"]'], ticket: 50 },
  { chave: "bar", rotulo: "Bar", filtros: ['["amenity"="bar"]', '["amenity"="pub"]'], ticket: 45 },
  { chave: "lanchonete", rotulo: "Lanchonete / Fast food", filtros: ['["amenity"="fast_food"]'], ticket: 40 },

  // ---- comércio ----
  { chave: "roupas", rotulo: "Loja de roupas", filtros: ['["shop"="clothes"]', '["shop"="boutique"]'], ticket: 60 },
  { chave: "otica", rotulo: "Ótica", filtros: ['["shop"="optician"]'], ticket: 70 },
  { chave: "joalheria", rotulo: "Joalheria", filtros: ['["shop"="jewelry"]'], ticket: 70 },
  { chave: "movelaria", rotulo: "Móveis / Decoração", filtros: ['["shop"="furniture"]', '["shop"="interior_decoration"]'], ticket: 70 },
  { chave: "construcao", rotulo: "Material de construção", filtros: ['["shop"="doityourself"]', '["shop"="hardware"]'], ticket: 65 },
  { chave: "auto", rotulo: "Oficina / Auto center", filtros: ['["shop"="car_repair"]', '["shop"="car"]'], ticket: 65 },
  { chave: "hotel", rotulo: "Hotel / Pousada", filtros: ['["tourism"="hotel"]', '["tourism"="guest_house"]'], ticket: 85 },
];

export function acharNicho(chave: string): Nicho | undefined {
  return NICHOS.find((n) => n.chave === chave);
}

// Poder de compra do segmento (eixo da nota). Nicho desconhecido fica no meio.
export function ticketDoNicho(chave: string | null | undefined): number {
  return acharNicho(chave ?? "")?.ticket ?? 60;
}
