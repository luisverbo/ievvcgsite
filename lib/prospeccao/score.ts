import { ticketDoNicho } from "./nichos";
import type { EmpresaEncontrada, Eixos, Potencial, SituacaoDigital } from "./tipos";

/*
 * Nota de POTENCIAL DE PROSPECÇÃO (0-100). Quanto maior, mais vale a pena
 * ligar. Não é uma avaliação da qualidade do site da empresa: empresa sem
 * site pontua alto justamente porque a venda é fácil.
 *
 * Quatro eixos, somados por peso:
 *   situação digital  40%  → tamanho da oportunidade
 *   vitalidade        35%  → tem dinheiro e se importa (evita negócio morto)
 *   segmento          15%  → quanto o ramo costuma pagar
 *   contato           10%  → dá para falar com ele hoje?
 */

export const PESOS = { situacao: 0.4, vitalidade: 0.35, segmento: 0.15, contato: 0.1 };

const PONTOS_SITUACAO: Record<SituacaoDigital, number> = {
  sem_nada: 100,
  // Acima de "sem nada" de propósito: quem mantém rede social já aceitou que
  // precisa de presença digital — a conversa começa no meio do caminho.
  social: 90,
  site_quebrado: 80,
  site_antigo: 65,
  site_moderno: 10,
};

const DOMINIOS_SOCIAIS = [
  "instagram.com",
  "facebook.com",
  "fb.com",
  "linktr.ee",
  "linktree",
  "beacons.ai",
  "linkbio",
  "wa.me",
  "bit.ly",
  "google.com",
  "sites.google.com",
  "wixsite.com",
  "negocio.site", // "site" gerado pelo Google Meu Negócio
];

// Um endereço que na prática é rede social/agregador, não site próprio.
export function ehEnderecoSocial(url: string | undefined | null): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  return DOMINIOS_SOCIAIS.some((d) => u.includes(d));
}

export type AnaliseSite = {
  acessivel: boolean;
  responsivo: boolean; // tem <meta viewport>
  anoRodape?: number; // último ano encontrado no rodapé
  https: boolean;
};

// Decide a situação digital a partir do que a busca trouxe e (quando existe
// site) do que a análise encontrou.
export function classificarSituacao(
  empresa: Pick<EmpresaEncontrada, "website" | "instagram" | "facebook">,
  analise?: AnaliseSite | null,
): SituacaoDigital {
  const temSocial = Boolean(empresa.instagram || empresa.facebook);
  const site = empresa.website?.trim();

  if (!site) return temSocial ? "social" : "sem_nada";
  if (ehEnderecoSocial(site)) return "social";
  if (!analise) return "site_antigo"; // ainda não analisado: assume oportunidade média
  if (!analise.acessivel) return "site_quebrado";

  const anoAtual = new Date().getFullYear();
  const desatualizado = analise.anoRodape !== undefined && analise.anoRodape <= anoAtual - 3;
  if (!analise.responsivo || desatualizado || !analise.https) return "site_antigo";
  return "site_moderno";
}

/*
 * Vitalidade: o negócio está vivo e se importa?
 *
 * O ideal seria usar as avaliações do Google (quantidade, recência, nota) —
 * é o sinal mais forte que existe. O OpenStreetMap não tem isso, então aqui
 * usamos o quanto o cadastro está preenchido como aproximação: quem tem
 * telefone, horário, endereço completo e rede social é alguém que cuida da
 * própria presença. Quando o agente do Google entrar, este eixo melhora sem
 * mudar o resto do cálculo.
 */
export function pontosVitalidade(e: EmpresaEncontrada): { pontos: number; motivos: string[] } {
  // Caminho bom: avaliações do Google. Volume mostra movimento real, e nota
  // alta mostra que o dono cuida da reputação — quem cuida, compra site.
  if (typeof e.avaliacoes === "number") {
    const n = e.avaliacoes;
    let pontos = n >= 150 ? 90 : n >= 50 ? 75 : n >= 10 ? 55 : n >= 1 ? 30 : 10;

    const nota = e.notaMedia;
    if (typeof nota === "number") {
      if (nota >= 4.5) pontos += 10;
      else if (nota >= 4.0) pontos += 5;
      else if (nota < 3.5) pontos -= 10; // reputação ruim: costuma ser negócio desleixado
    }
    pontos = Math.max(5, Math.min(100, pontos));

    const motivos: string[] = [];
    if (n === 0) motivos.push("nenhuma avaliação no Google");
    else motivos.push(`${n} avaliações${nota ? ` · nota ${nota.toFixed(1)}` : ""}`);
    return { pontos, motivos };
  }

  const sinais: [boolean, string][] = [
    [Boolean(e.telefone), "telefone cadastrado"],
    [Boolean(e.endereco), "endereço completo"],
    [e.temHorario, "horário de funcionamento publicado"],
    [Boolean(e.instagram || e.facebook), "rede social ativa"],
    [e.temEmail, "e-mail de contato"],
    [Boolean(e.categoria), "categoria definida"],
  ];
  const presentes = sinais.filter(([ok]) => ok);
  // Base 20 para nunca zerar um cadastro magro que ainda pode ser bom.
  const pontos = Math.min(100, 20 + presentes.length * 14);
  return { pontos, motivos: presentes.map(([, texto]) => texto) };
}

export function pontosContato(e: EmpresaEncontrada): number {
  if (!e.telefone) return e.instagram || e.facebook ? 40 : 10;
  // Celular brasileiro (9 dígitos) quase sempre tem WhatsApp.
  const digitos = e.telefone.replace(/\D/g, "");
  const ehCelular = /9\d{8}$/.test(digitos);
  return ehCelular ? 100 : 70;
}

export function calcularPotencial(
  empresa: EmpresaEncontrada,
  nicho: string | null | undefined,
  analise?: AnaliseSite | null,
): Potencial {
  const situacao = classificarSituacao(empresa, analise);
  const vit = pontosVitalidade(empresa);

  const eixos: Eixos = {
    situacao: PONTOS_SITUACAO[situacao],
    vitalidade: vit.pontos,
    segmento: ticketDoNicho(nicho),
    contato: pontosContato(empresa),
  };

  const pontuacao = Math.round(
    eixos.situacao * PESOS.situacao +
      eixos.vitalidade * PESOS.vitalidade +
      eixos.segmento * PESOS.segmento +
      eixos.contato * PESOS.contato,
  );

  const motivos: string[] = [];
  if (situacao === "sem_nada") motivos.push("Não tem site nem rede social — oportunidade aberta");
  if (situacao === "social") motivos.push("Só tem rede social: já entende presença digital, falta o site");
  if (situacao === "site_quebrado") motivos.push("O site está fora do ar");
  if (situacao === "site_antigo") {
    if (analise && !analise.responsivo) motivos.push("O site não funciona direito no celular");
    else if (analise?.anoRodape) motivos.push(`Site parado desde ${analise.anoRodape}`);
    else if (analise && !analise.https) motivos.push("O site não tem certificado de segurança (HTTPS)");
    else motivos.push("Site aparenta ser antigo");
  }
  if (situacao === "site_moderno") motivos.push("Já tem site moderno — provavelmente não vale o telefonema");

  if (typeof empresa.avaliacoes === "number") {
    if (empresa.avaliacoes >= 50) motivos.push(`Negócio movimentado: ${vit.motivos[0]}`);
    else if (empresa.avaliacoes === 0) motivos.push("Sem avaliações no Google — pode estar parado");
    else motivos.push(`Poucas avaliações: ${vit.motivos[0]}`);
  } else if (vit.motivos.length >= 4) {
    motivos.push(`Cadastro bem cuidado (${vit.motivos.slice(0, 3).join(", ")})`);
  } else if (vit.motivos.length <= 1) {
    motivos.push("Cadastro quase vazio — pode ser negócio inativo");
  }

  if (eixos.contato === 100) motivos.push("Telefone celular: provavelmente WhatsApp");
  else if (eixos.contato <= 10) motivos.push("Sem telefone — contato só presencial");

  if (eixos.segmento >= 85) motivos.push("Segmento que costuma pagar bem por um site");

  return { pontuacao, eixos, motivos, situacao };
}
