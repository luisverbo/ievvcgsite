import "server-only";

import { acharNicho } from "./nichos";
import { briefingDoNicho } from "./briefings";
import { resumoParaBriefing } from "./instagram";
import type { ProspectoRow } from "./tipos";

/*
 * O briefing completo de uma empresa prospectada — o pedido que faz a IA
 * escrever a página COM os dados reais dela (endereço, WhatsApp, fotos do
 * Instagram) em vez de uma página genérica bonita.
 *
 * Extraído para cá porque agora tem dois consumidores: o botão "Gerar site"
 * (que abre o construtor com o pedido pronto) e o Fechador (que gera sozinho
 * quando o lead responde). Dois textos diferentes divergiriam em semanas — e
 * o site do Fechador sairia pior justamente na venda mais quente.
 */
export function montarBriefingDoProspecto(p: ProspectoRow): string {
  const ramo = acharNicho(p.nicho_busca ?? "")?.rotulo ?? p.categoria ?? "negócio local";

  // Fotos reais do Instagram valem mais que imagem gerada: a pessoa reconhece
  // a própria loja na tela, e não custa nada.
  const fotos = Array.isArray(p.ig_fotos) ? p.ig_fotos : [];
  const blocoIg = [
    resumoParaBriefing(p),
    fotos.length
      ? `FOTOS REAIS DA EMPRESA (use estas nas <img src="...">, NÃO peça geração de imagem para elas):\n${fotos
          .map((f, i) => `${i + 1}. ${f.url}${f.legenda ? ` — ${f.legenda}` : ""}`)
          .join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const dados = [
    p.endereco ? `Endereço: ${p.endereco}` : "",
    p.telefone ? `Telefone/WhatsApp: ${p.telefone}` : "",
    p.instagram ? `Instagram: ${p.instagram}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `Crie uma landing page de alta conversão para "${p.nome}", ${ramo.toLowerCase()}${
    p.local_busca ? ` em ${p.local_busca}` : ""
  }.

DADOS REAIS DA EMPRESA (use estes, não invente):
${dados || "(sem dados de contato — deixe os campos marcados para eu preencher)"}

${blocoIg ? `${blocoIg}\n\n` : ""}${briefingDoNicho(p.nicho_busca)}
OBJETIVO: fazer o visitante chamar no WhatsApp. Todo botão principal deve levar ao WhatsApp do número acima (link https://wa.me/55DDDNUMERO com uma mensagem pronta).
Se faltar alguma informação (preços, nome da equipe, depoimentos), escreva um exemplo plausível e me avise no final o que devo trocar.`;
}
