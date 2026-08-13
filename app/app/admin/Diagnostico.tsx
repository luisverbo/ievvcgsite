import { cardClass } from "@/components/painel/ui";

/*
 * O que o servidor está enxergando.
 *
 * Variável configurada na Vercel e não implantada é o erro mais comum de todos
 * — e o mais difícil de enxergar, porque a tela erra em silêncio ou dá uma
 * mensagem genérica. Aqui a resposta é direta: chegou ou não chegou.
 *
 * Mostra só se existe, NUNCA o valor. Um print desta tela não vaza nada.
 */

type Item = { chave: string; rotulo: string; para: string; obrigatoria: boolean };

const VARIAVEIS: Item[] = [
  {
    chave: "NEXT_PUBLIC_APP_URL",
    rotulo: "Endereço do site",
    para: "retorno do pagamento e o .env do agente",
    obrigatoria: true,
  },
  {
    chave: "APP_CRYPTO_KEY",
    rotulo: "Segredo de criptografia",
    para: "guardar as chaves de API dos clientes",
    obrigatoria: true,
  },
  {
    chave: "STRIPE_SECRET_KEY",
    rotulo: "Stripe · chave secreta",
    para: "cobrar no cartão",
    obrigatoria: true,
  },
  {
    chave: "STRIPE_PRICE_AGENCIA",
    rotulo: "Stripe · id do preço",
    para: "a mensalidade recorrente",
    obrigatoria: true,
  },
  {
    chave: "STRIPE_WEBHOOK_SECRET",
    rotulo: "Stripe · segredo do webhook",
    para: "transformar pagamento em acesso",
    obrigatoria: true,
  },
  {
    chave: "MERCADOPAGO_ACCESS_TOKEN",
    rotulo: "Mercado Pago · token",
    para: "gerar Pix",
    obrigatoria: false,
  },
  {
    chave: "MERCADOPAGO_WEBHOOK_SECRET",
    rotulo: "Mercado Pago · segredo do webhook",
    para: "confirmar o Pix com segurança",
    obrigatoria: false,
  },
  {
    chave: "ANTHROPIC_API_KEY",
    rotulo: "Anthropic (da plataforma)",
    para: "a IA de quem usa crédito",
    obrigatoria: false,
  },
  {
    chave: "OPENAI_API_KEY",
    rotulo: "OpenAI (da plataforma)",
    para: "gerar imagens",
    obrigatoria: false,
  },
];

export default function Diagnostico() {
  /*
   * Lido uma a uma, escrito literal: `process.env[variavel]` não funciona no
   * build da Vercel, que troca cada nome pelo valor em tempo de compilação.
   */
  const valores: Record<string, string | undefined> = {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    APP_CRYPTO_KEY: process.env.APP_CRYPTO_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_PRICE_AGENCIA: process.env.STRIPE_PRICE_AGENCIA,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN,
    MERCADOPAGO_WEBHOOK_SECRET: process.env.MERCADOPAGO_WEBHOOK_SECRET,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };

  const faltando = VARIAVEIS.filter((v) => v.obrigatoria && !valores[v.chave]?.trim());

  return (
    <div className={cardClass}>
      <h2 className="text-lg font-bold">🔌 O que o servidor está enxergando</h2>
      <p className="mt-1 text-sm text-paper-dim">
        Variável cadastrada na Vercel só vale depois de um <b className="text-paper">Redeploy</b>. É
        aqui que você confere se ela chegou de verdade. Nenhum valor é mostrado.
      </p>

      {faltando.length > 0 && (
        <p className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          Faltam {faltando.length} variáveis obrigatórias. Sem elas, partes do sistema não
          funcionam.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-1.5">
        {VARIAVEIS.map((v) => {
          const tem = !!valores[v.chave]?.trim();
          return (
            <div
              key={v.chave}
              className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg border border-white/10 px-3 py-2 text-xs"
            >
              <span className={`font-bold ${tem ? "text-ok" : v.obrigatoria ? "text-danger" : "text-paper-dim"}`}>
                {tem ? "✓" : "—"}
              </span>
              <span className="font-bold text-paper">{v.rotulo}</span>
              <span className="text-paper-dim">{v.para}</span>
              {!tem && !v.obrigatoria && (
                <span className="text-paper-dim/60">opcional</span>
              )}
              <code className="ml-auto font-mono text-[11px] text-paper-dim/60">{v.chave}</code>
            </div>
          );
        })}
      </div>
    </div>
  );
}
