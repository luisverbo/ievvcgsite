import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { getExtrato } from "./actions";
import { comprarCreditoCartao } from "../assinatura/actions";
import PixCredito from "./PixCredito";
import FormChave from "./FormChave";
import { emDolar, paginasRestantes, PACOTES, COTACAO_VENDA } from "@/lib/creditos/precos";
import { cardClass } from "@/components/painel/ui";

export const dynamic = "force-dynamic";

const ROTULO_TIPO: Record<string, string> = {
  cota: "Crédito mensal",
  compra: "Compra de créditos",
  uso: "Consumo",
  ajuste: "Ajuste",
  estorno: "Estorno",
};

type OrgCreditos = {
  id: string;
  creditos: number;
  cota_mensal: number;
  anthropic_key_final: string | null;
  openai_key_final: string | null;
};

export default async function CreditosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string; cancelado?: string }>;
}) {
  const { ok, erro } = await searchParams;
  const orgBase = await getMinhaOrg();
  if (!orgBase) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("organizacoes")
    .select("id, creditos, cota_mensal, anthropic_key_final, openai_key_final")
    .eq("id", orgBase.id)
    .maybeSingle();
  const org = (data as OrgCreditos | null) ?? {
    id: orgBase.id,
    creditos: 0,
    cota_mensal: 0,
    anthropic_key_final: null,
    openai_key_final: null,
  };

  const extrato = await getExtrato(org.id);
  const usandoPropria = !!org.anthropic_key_final;

  return (
    <div className="painel-wrap flex flex-col gap-6">
      <div>
        <Link href="/app" className="text-sm text-paper-dim hover:text-paper">
          ← Painel
        </Link>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Créditos de IA 💳</h1>
        <p className="mt-1 text-sm text-paper-dim">
          Toda página e ebook criados com IA consomem créditos. Você escolhe:{" "}
          <b className="text-paper">usar os créditos daqui</b> ou{" "}
          <b className="text-paper">colar a sua própria chave</b> e pagar direto à Anthropic.
        </p>
      </div>

      {ok && (
        <p role="status" className="rounded-lg border border-ok/40 bg-ok/10 px-4 py-3 text-sm text-ok">
          ✓ Pagamento confirmado. O crédito entra em segundos — atualize a página se ainda não
          apareceu.
        </p>
      )}
      {erro && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {erro}
        </p>
      )}

      {/* saldo */}
      <div className={cardClass}>
        {usandoPropria ? (
          <>
            <p className="text-sm font-bold text-ok">✓ Você está usando a sua própria chave</p>
            <p className="mt-1 text-sm text-paper-dim">
              Nada é descontado daqui — a cobrança cai direto na sua conta da Anthropic. Seu saldo de{" "}
              {emDolar(org.creditos)} fica guardado para quando você quiser voltar.
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
              <span className="font-display text-4xl font-extrabold text-paper">
                {emDolar(org.creditos)}
              </span>
              <span className="pb-1 text-sm text-paper-dim">
                dá para umas <b className="text-paper">{paginasRestantes(org.creditos)} páginas</b>
              </span>
            </div>
            {org.cota_mensal > 0 && (
              <p className="mt-2 text-xs text-paper-dim">
                Seu plano repõe {emDolar(org.cota_mensal)} todo mês, automaticamente.
              </p>
            )}
          </>
        )}
      </div>

      {/* comprar */}
      <div>
        <h2 className="mb-2 text-sm font-bold">Comprar créditos</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {PACOTES.map((p) => (
            <div
              key={p.dolares}
              className="rounded-xl border border-white/10 bg-ink-2 p-4 transition hover:border-brand-2/50"
            >
              <p className="font-display text-2xl font-extrabold text-paper">US$ {p.dolares}</p>
              <p className="text-xs text-paper-dim">{p.rotulo}</p>
              <p className="mt-3 text-lg font-bold text-brand-2">
                R$ {p.preco.toLocaleString("pt-BR")}
              </p>
              <form action={comprarCreditoCartao.bind(null, p.dolares)}>
                <button
                  type="submit"
                  className="mt-2 w-full rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-2"
                >
                  Pagar no cartão
                </button>
              </form>
              <PixCredito dolares={p.dolares} preco={p.preco} />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-paper-dim">
          O preço já inclui impostos e a variação do câmbio (R$ {COTACAO_VENDA.toFixed(2)} por dólar
          de crédito). Crédito comprado não expira.
        </p>
      </div>

      {/* chaves próprias */}
      <div>
        <h2 className="mb-1 text-sm font-bold">Usar a minha própria chave</h2>
        <p className="mb-3 text-xs text-paper-dim">
          Sai mais barato se você usa muito: você paga o preço de custo direto à Anthropic, sem
          passar por aqui. A chave é guardada criptografada e nunca aparece na tela de novo. Se ela
          ficar sem crédito ou for revogada, o sistema não trava — usa o crédito da plataforma
          naquela geração e avisa no próprio chat.
        </p>
        <div className="flex flex-col gap-3">
          <FormChave
            qual="anthropic"
            titulo="Chave da Anthropic (Claude)"
            ajuda="Cria as páginas e os ebooks. Pegue em console.anthropic.com → API Keys."
            final={org.anthropic_key_final}
            onde="sk-ant-..."
          />
          <FormChave
            qual="openai"
            titulo="Chave da OpenAI (opcional)"
            ajuda="Só para gerar imagens. Sem ela, as imagens saem dos seus créditos."
            final={org.openai_key_final}
            onde="sk-..."
          />
        </div>
      </div>

      {/* extrato */}
      <div>
        <h2 className="mb-2 text-sm font-bold">Extrato</h2>
        {extrato.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-paper-dim">
            Nada por aqui ainda. Cada geração de página ou ebook aparece nesta lista.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {extrato.map((l) => (
              <div
                key={l.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/10 px-3 py-2 text-xs"
              >
                <span className="font-bold text-paper">{ROTULO_TIPO[l.tipo] ?? l.tipo}</span>
                <span className="text-paper-dim">{l.descricao}</span>
                {l.modelo && <span className="text-paper-dim/60">{l.modelo}</span>}
                <span className={`ml-auto font-bold ${l.valor < 0 ? "text-danger" : "text-ok"}`}>
                  {l.valor < 0 ? "−" : "+"}
                  {emDolar(Math.abs(l.valor))}
                </span>
                <span className="w-full text-paper-dim/60 sm:w-auto">
                  {new Date(l.created_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
