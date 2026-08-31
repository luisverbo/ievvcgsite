import { cardClass } from "@/components/painel/ui";
import TesteMp from "./TesteMp";

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
    chave: "STRIPE_PRICE_PRO",
    rotulo: "Stripe · id do preço do Pro",
    para: "vender o plano Pro (R$147)",
    obrigatoria: false,
  },
  {
    chave: "STRIPE_PRICE_SITE_EXTRA",
    rotulo: "Stripe · id do preço do site extra",
    para: "cobrar hospedagem acima da cota do plano",
    obrigatoria: false,
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
    chave: "TOKEN_VERCEL",
    rotulo: "Vercel · token da API",
    para: "conectar domínio próprio dos clientes",
    obrigatoria: false,
  },
  {
    chave: "PROJETO_VERCEL",
    rotulo: "Vercel · id do projeto",
    para: "saber em qual projeto pendurar os domínios",
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
    STRIPE_PRICE_PRO: process.env.STRIPE_PRICE_PRO,
    STRIPE_PRICE_SITE_EXTRA: process.env.STRIPE_PRICE_SITE_EXTRA,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN,
    MERCADOPAGO_WEBHOOK_SECRET: process.env.MERCADOPAGO_WEBHOOK_SECRET,
    TOKEN_VERCEL: process.env.TOKEN_VERCEL,
    PROJETO_VERCEL: process.env.PROJETO_VERCEL,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };

  const faltando = VARIAVEIS.filter((v) => v.obrigatoria && !valores[v.chave]?.trim());

  /*
   * Nomes REAIS que chegaram ao servidor, contendo MERCADO ou STRIPE.
   *
   * É o que pega o caso "eu cadastrei e ela não aparece": um espaço no fim do
   * nome, um underscore a mais, a variável em outro projeto. Aqui aparece o
   * nome exatamente como foi gravado — entre aspas, para espaço ficar visível.
   * Só o nome; valor, nunca.
   */
  const nomesPagamento = Object.keys(process.env)
    .filter((k) => /MERCADO|STRIPE/i.test(k))
    .sort();

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

      {/* nomes crus, para caçar erro de digitação e espaço invisível */}
      <div className="mt-4 rounded-lg border border-white/10 bg-ink px-3 py-2.5">
        <p className="text-xs font-bold text-paper">
          Variáveis de pagamento que o servidor recebeu (nome exato, entre aspas):
        </p>
        {nomesPagamento.length === 0 ? (
          <p className="mt-1 text-xs text-danger">
            Nenhuma. As variáveis estão em outro projeto da Vercel, em outro ambiente, ou faltou o
            Redeploy depois de cadastrar.
          </p>
        ) : (
          <ul className="mt-1 flex flex-col gap-0.5">
            {nomesPagamento.map((n) => (
              <li key={n} className="font-mono text-[11px] text-paper-dim">
                {JSON.stringify(n)}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-paper-dim">
          Se aparecer algo como <code>&quot;MERCADOPAGO_ACCESS_TOKEN &quot;</code> (com espaço antes
          da aspa final) ou um nome escrito diferente, é isso: apague a variável na Vercel e crie de
          novo com o nome limpo.
        </p>
      </div>

      <Roteamento />
      <TesteMp />
    </div>
  );
}

/*
 * Quem é "nosso" e quem é "do cliente".
 *
 * Todo visitante chega com um Host. O proxy tem que dizer, sem consultar nada,
 * se aquele endereço é o painel ou o site de um cliente. Errar para o lado
 * "é nosso" é o pior caso: o cliente paga pela hospedagem e o visitante dele
 * vê a NOSSA página de vendas.
 *
 * São nomes de domínio, não segredo — pode aparecer inteiro.
 */
function Roteamento() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  let hostPainel = "";
  try {
    hostPainel = new URL(appUrl!).hostname.toLowerCase();
  } catch {
    hostPainel = "";
  }
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  const producao = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const hostProspector = (process.env.NEXT_PUBLIC_HOST_PROSPECTOR ?? "")
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .split(":")[0];

  const nossos = [
    root,
    root && `www.${root}`,
    root && `app.${root}`,
    hostPainel,
    hostProspector,
    hostProspector && `www.${hostProspector}`,
    "localhost",
    "127.0.0.1",
  ].filter(Boolean) as string[];

  // Se a Vercel elegeu um domínio de cliente como "produção", isso é normal —
  // só não pode mais influenciar o roteamento. O aviso existe para você saber
  // que é esperado, e não sair caçando problema onde não tem.
  const producaoEhCliente = !!producao && producao !== hostPainel && !producao.endsWith(".vercel.app");

  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-ink px-3 py-2.5">
      <p className="text-xs font-bold text-paper">Roteamento de domínio</p>
      <p className="mt-1 text-[11px] text-paper-dim">
        Endereços tratados como <b className="text-paper">nossos</b> (mostram o painel e a página de
        vendas). Qualquer outro Host vira site de cliente.
      </p>
      <ul className="mt-1.5 flex flex-col gap-0.5">
        {nossos.map((h) => (
          <li key={h} className="font-mono text-[11px] text-paper-dim">
            {h}
          </li>
        ))}
        <li className="font-mono text-[11px] text-paper-dim">*.vercel.app</li>
        {root && <li className="font-mono text-[11px] text-paper-dim">*.{root}</li>}
      </ul>
      {!hostPainel && (
        <p className="mt-2 text-[11px] text-danger">
          NEXT_PUBLIC_APP_URL está vazia ou malformada — precisa do endereço completo, com https://
        </p>
      )}
      {hostProspector ? (
        <p className="mt-2 text-[11px] text-ok">
          <code className="text-paper">{hostProspector}</code> abre direto na página de venda do
          Prospector. O resto do sistema (painel, login, pagamento) funciona igual neste endereço.
        </p>
      ) : (
        <p className="mt-2 text-[11px] text-paper-dim">
          Sem <code className="text-paper">NEXT_PUBLIC_HOST_PROSPECTOR</code>: nenhum domínio abre
          direto no Prospector — ele responde só em <code className="text-paper">/prospector</code>.
        </p>
      )}
      {producaoEhCliente && (
        <p className="mt-2 text-[11px] text-paper-dim">
          A Vercel está chamando <code className="text-paper">{producao}</code> de &quot;domínio de
          produção&quot; do projeto. É normal quando o primeiro domínio conectado é de cliente, e não
          afeta o roteamento.
        </p>
      )}
    </div>
  );
}
