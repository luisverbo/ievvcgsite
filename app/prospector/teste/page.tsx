import Landing from "../Landing";
import { configDoTeste } from "@/lib/painel/teste";

/*
 * A landing do TESTE GRÁTIS — a página de campanha.
 *
 * Mesma copy da landing de venda (Landing.tsx), com a promessa trocada: em
 * vez de "assine por R$97", "teste grátis por N dias, sem cartão". Separada
 * de propósito, para o anúncio do teste não misturar com o da assinatura e
 * cada um medir a própria conversão. No domínio do Prospector ela atende em
 * /teste (veja proxy.ts).
 *
 * Os dias e os tetos vêm do Admin (card "Teste grátis"): mudar de 7 para 14
 * dias lá muda aqui, no cadastro e no painel, sem deploy.
 */

export const revalidate = 600;

export async function generateMetadata() {
  const cfg = await configDoTeste();
  return {
    title: `Prospector — ${cfg.dias} dias grátis, sem cartão`,
    description: `Teste o Prospector por ${cfg.dias} dias sem pagar nada: o Agente encontra empresas no Google Maps, monta a abordagem com o nome de cada uma e envia pelo seu WhatsApp. Até ${cfg.empresasPorDia} empresas e ${cfg.enviosPorDia} mensagens por dia no teste. Sem cartão.`,
  };
}

export default function ProspectorTestePage() {
  return <Landing variante="teste" />;
}
