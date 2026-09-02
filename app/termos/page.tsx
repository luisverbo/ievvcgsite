import Link from "next/link";
import type { Metadata } from "next";
import { precoEmReais } from "@/lib/pagamentos/planos";

/*
 * Termos de uso — a versão que uma pessoa consegue ler.
 *
 * Estão aqui porque vender assinatura sem termos é vender sem combinar as
 * regras: garantia, cancelamento, o que é responsabilidade de quem. E porque
 * a página de vendas promete "7 dias de garantia" e "cancele quando quiser"
 * — isto é o documento que sustenta a promessa.
 *
 * Linguagem direta de propósito. Termo que ninguém lê não protege ninguém.
 */

export const metadata: Metadata = { title: "Termos de uso" };

const ATUALIZADO = "2 de setembro de 2026";

export default function TermosPage() {
  const precoProspector = precoEmReais("prospector");
  return (
    <div className="min-h-screen bg-[#f7f9fe] px-5 py-14 text-[#1a1c22]">
      <article className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-[#5f6672] hover:text-[#1a1c22]">
          ← Voltar
        </Link>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Termos de uso
        </h1>
        <p className="mt-2 text-sm text-[#5f6672]">Última atualização: {ATUALIZADO}</p>

        <div className="prose-pp mt-8 flex flex-col gap-6 text-[15px] leading-relaxed text-[#3c4048]">
          <section>
            <h2 className="font-display text-xl font-extrabold text-[#1a1c22]">1. O que é o serviço</h2>
            <p className="mt-2">
              O PáginaPro e o Prospector são serviços de software por assinatura. O PáginaPro cria e
              hospeda páginas; o Prospector encontra empresas no Google Maps e organiza a abordagem
              delas pelo WhatsApp do próprio assinante. Ao criar uma conta você concorda com estes
              termos.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold text-[#1a1c22]">2. Assinatura, preço e cancelamento</h2>
            <p className="mt-2">
              A assinatura é mensal, cobrada no cartão pela Stripe, e renova automaticamente até ser
              cancelada. O preço vigente aparece na página de vendas e na tela de assinatura (o
              Prospector custa R$ {precoProspector}/mês). Não há fidelidade nem multa: você cancela
              a qualquer momento, direto no painel, e o acesso continua até o fim do período já
              pago. Não fazemos reembolso proporcional de mês em andamento, salvo o previsto na
              garantia abaixo.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold text-[#1a1c22]">3. Garantia de 7 dias</h2>
            <p className="mt-2">
              No Prospector: se, nos primeiros 7 dias após a primeira cobrança, o serviço não
              encontrar pelo menos 100 empresas do ramo e da região que você pesquisou, com
              telefone, você pode pedir o reembolso integral pelo suporte. A garantia é sobre o que
              o serviço entrega (a lista), não sobre resultado de vendas, que depende de você e do
              seu mercado. Além dela, vale o direito de arrependimento de 7 dias do Código de Defesa
              do Consumidor (art. 49).
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold text-[#1a1c22]">4. O WhatsApp é seu — e a responsabilidade também</h2>
            <p className="mt-2">
              O Prospector envia mensagens pelo WhatsApp conectado por você, no seu computador, com
              o texto, o volume e o ritmo que você configura. Você é o remetente. Cabe a você usar a
              ferramenta de acordo com as políticas do WhatsApp e com a lei, em especial respeitando
              quem pedir para não receber mensagens (o sistema faz esse bloqueio automaticamente e
              você não deve contorná-lo). Nenhuma automação elimina o risco de restrições por parte
              do WhatsApp, e não nos responsabilizamos por bloqueios, suspensões ou perda de acesso
              ao seu número.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold text-[#1a1c22]">5. Os dados das empresas</h2>
            <p className="mt-2">
              As informações das empresas vêm de fontes públicas (Google Maps) ou de planilhas que
              você mesmo importa. Elas são armazenadas na sua conta para o seu uso profissional de
              prospecção entre empresas. Você não deve usar o serviço para abordar consumidores
              pessoa física, enviar conteúdo enganoso ou ilegal, ou revender as listas.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold text-[#1a1c22]">6. Uso aceitável</h2>
            <p className="mt-2">
              É proibido usar o serviço para spam, fraude, assédio, ou qualquer atividade que viole
              a lei ou os termos do WhatsApp e do Google. Podemos suspender contas que violem estas
              regras. Você é responsável por manter sua senha em sigilo e por tudo o que for feito
              com a sua conta.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold text-[#1a1c22]">7. Disponibilidade e limitações</h2>
            <p className="mt-2">
              Trabalhamos para manter o serviço no ar, mas ele depende de terceiros (Google,
              WhatsApp, provedores de nuvem) que mudam sem aviso. Podemos precisar ajustar ou
              interromper funcionalidades para acompanhar essas mudanças. O serviço é fornecido
              como está, sem garantia de resultado comercial.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold text-[#1a1c22]">8. Alterações</h2>
            <p className="mt-2">
              Podemos atualizar estes termos. Mudanças relevantes serão avisadas no painel ou por
              e-mail com antecedência. Continuar usando o serviço depois disso significa aceitar a
              versão nova.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold text-[#1a1c22]">9. Contato</h2>
            <p className="mt-2">
              Dúvidas, pedidos de reembolso e cancelamento: pelo painel ou pelo WhatsApp do suporte
              indicado na página de vendas. Veja também a nossa{" "}
              <Link href="/privacidade" className="font-semibold text-[#1967d2] underline">
                Política de privacidade
              </Link>
              .
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
