import Link from "next/link";
import type { Metadata } from "next";

/*
 * Política de privacidade, em português de gente.
 *
 * O ponto que mais importa aqui — e que quase nenhuma política diz com
 * clareza — é o do WhatsApp: a sessão fica no computador do assinante, nós
 * nunca vemos a senha nem as conversas dele. É a promessa de segurança que
 * o painel faz e que este documento sustenta.
 */

export const metadata: Metadata = { title: "Política de privacidade" };

const ATUALIZADO = "2 de setembro de 2026";

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-[#f7f9fe] px-5 py-14 text-[#1a1c22]">
      <article className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-[#5f6672] hover:text-[#1a1c22]">
          ← Voltar
        </Link>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Política de privacidade
        </h1>
        <p className="mt-2 text-sm text-[#5f6672]">Última atualização: {ATUALIZADO}</p>

        <div className="mt-8 flex flex-col gap-6 text-[15px] leading-relaxed text-[#3c4048]">
          <section>
            <h2 className="font-display text-xl font-extrabold text-[#1a1c22]">1. O que coletamos de você</h2>
            <p className="mt-2">
              Para criar a conta: e-mail e senha (a senha é guardada de forma cifrada; nem nós
              conseguimos lê-la). Para cobrar: os dados de pagamento vão direto para a Stripe — não
              passam nem ficam nos nossos servidores. Para o serviço funcionar: o nome do seu espaço,
              as configurações que você faz no painel e os dados das empresas que você prospecta ou
              importa.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold text-[#1a1c22]">2. O seu WhatsApp</h2>
            <p className="mt-2">
              A conexão do seu WhatsApp acontece no <b>seu computador</b>, pelo programa do Agente,
              e fica gravada só lá. Nós não recebemos a sua senha, não temos acesso à sua conta do
              WhatsApp e não lemos as suas conversas. O que chega até o painel é o mínimo para ele
              funcionar: quais mensagens de prospecção foram enviadas, e o texto das respostas dos
              contatos abordados, para que você veja no painel quem respondeu.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold text-[#1a1c22]">3. Os dados das empresas prospectadas</h2>
            <p className="mt-2">
              Vêm de fontes públicas (Google Maps) ou de planilhas que você importa, e são
              armazenados na sua conta, isolados das demais. São dados de empresas (nome, telefone
              comercial, endereço, avaliações públicas), usados para a sua prospecção entre
              empresas. Você pode exportá-los ou apagá-los quando quiser.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold text-[#1a1c22]">4. Nas nossas páginas de venda</h2>
            <p className="mt-2">
              Usamos medição própria (visitas, cliques, até onde a página foi lida) e podemos usar o
              pixel do Meta e a tag do Google para medir os nossos anúncios. Esses dados servem para
              entender o que funciona na página; não vendemos informação de visitante a ninguém.
              Dentro do painel, depois do login, não há pixel de anúncio.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold text-[#1a1c22]">5. Com quem compartilhamos</h2>
            <p className="mt-2">
              Só com quem é necessário para o serviço existir: Supabase (banco de dados e login),
              Vercel (hospedagem), Stripe e Mercado Pago (pagamentos) e Resend (envio de e-mails
              transacionais, como o de boas-vindas e o de recuperação de senha). Cada um trata os
              dados dentro da própria política de privacidade. Não vendemos nem cedemos seus dados
              para marketing de terceiros.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold text-[#1a1c22]">6. Por quanto tempo</h2>
            <p className="mt-2">
              Enquanto a sua conta existir. Ao cancelar, o acesso continua até o fim do período
              pago; depois disso você pode pedir a exclusão completa da conta e dos dados pelo
              suporte. Registros de pagamento são mantidos pelo prazo que a lei fiscal exige.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold text-[#1a1c22]">7. Seus direitos</h2>
            <p className="mt-2">
              Nos termos da LGPD (Lei 13.709/2018), você pode pedir acesso, correção, exportação ou
              exclusão dos seus dados, e esclarecimentos sobre como os usamos. Basta falar com o
              suporte pelo canal indicado na página de vendas ou no painel.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold text-[#1a1c22]">8. Alterações</h2>
            <p className="mt-2">
              Podemos atualizar esta política. Mudanças relevantes serão avisadas no painel ou por
              e-mail. Veja também os{" "}
              <Link href="/termos" className="font-semibold text-[#1967d2] underline">
                Termos de uso
              </Link>
              .
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
