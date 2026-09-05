import Landing from "./Landing";

/*
 * A landing do PROSPECTOR — a de VENDA (assinar por R$97/mês).
 *
 * O conteúdo inteiro mora em Landing.tsx, compartilhado com a variante de
 * teste grátis (/prospector/teste). Uma página, duas portas de entrada: a
 * copy e os blocos são os mesmos; mudam os botões e a promessa do topo.
 */

export const revalidate = 3600;

export const metadata = {
  title: "Prospector — Pare de perder horas procurando clientes",
  description:
    "Para quem vende para empresas pelo WhatsApp: um Agente de IA encontra empresas no Google Maps, monta a abordagem com o nome de cada uma e envia pelo seu WhatsApp, com remarketing automático. R$97/mês, sem cobrança por lead. Garantia de 7 dias.",
};

export default function ProspectorPage() {
  return <Landing variante="assinar" />;
}
