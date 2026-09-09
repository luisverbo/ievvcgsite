import type { Metadata } from "next";
import Landing from "./Landing";
import { urlDoProspector } from "@/lib/site/url";

/*
 * A landing do PROSPECTOR — a de VENDA (assinar por R$97/mês).
 *
 * O conteúdo inteiro mora em Landing.tsx, compartilhado com a variante de
 * teste grátis (/prospector/teste). Uma página, duas portas de entrada: a
 * copy e os blocos são os mesmos; mudam os botões e a promessa do topo.
 */

export const revalidate = 3600;

const TITULO = "Prospector — Pare de perder horas procurando clientes";
const DESCRICAO =
  "Para quem vende para empresas pelo WhatsApp: um Agente de IA encontra empresas no Google Maps, monta a abordagem com o nome de cada uma e envia pelo seu WhatsApp, com remarketing automático. R$97/mês, sem cobrança por lead. Garantia de 7 dias.";

/*
 * `metadataBase` no domínio DO PROSPECTOR, e não no principal: é este link
 * que vai no anúncio e nas conversas, e o cartão do WhatsApp mostra o
 * domínio da imagem. Buscar a imagem em outro domínio funciona, mas passa
 * a impressão errada logo no primeiro contato.
 */
export const metadata: Metadata = {
  metadataBase: new URL(urlDoProspector()),
  title: TITULO,
  description: DESCRICAO,
  openGraph: {
    type: "website",
    siteName: "Prospector",
    locale: "pt_BR",
    url: urlDoProspector(),
    title: TITULO,
    description: DESCRICAO,
  },
  twitter: { card: "summary_large_image", title: TITULO, description: DESCRICAO },
};

export default function ProspectorPage() {
  return <Landing variante="assinar" />;
}
