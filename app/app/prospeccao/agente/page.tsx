import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { podeUsar } from "@/lib/painel/permissoes";
import { apagarAgente } from "./actions";
import NovoToken from "./NovoToken";
import { cardClass } from "@/components/painel/ui";
import { IconTrash } from "@/components/painel/icons";

export const dynamic = "force-dynamic";

type AgenteRow = {
  id: string;
  nome: string;
  token_final: string;
  ultimo_contato: string | null;
  created_at: string;
};

// Online = deu sinal nos últimos 5 minutos. O agente avisa a cada volta da
// fila, então esse prazo cobre folgado o intervalo normal.
function online(ultimo: string | null) {
  return !!ultimo && Date.now() - new Date(ultimo).getTime() < 5 * 60_000;
}

const PASSOS = [
  {
    titulo: "Instale o Node",
    texto: "Baixe em nodejs.org e instale (versão 22 ou maior). É o programa que faz o agente rodar.",
  },
  {
    titulo: "Baixe o agente",
    texto: "Descompacte a pasta em qualquer lugar do seu computador — a Área de Trabalho serve.",
  },
  {
    titulo: "Abra o terminal na pasta e rode a instalação",
    texto: "npm install && npm run instalar-navegador",
    codigo: true,
  },
  {
    titulo: "Cole o seu código",
    texto:
      "Crie um arquivo chamado .env dentro da pasta agente e cole ali as duas linhas que aparecem acima.",
  },
  {
    titulo: "Ligue",
    texto: "npm run servico",
    codigo: true,
  },
];

export default async function MeuAgentePage() {
  if (!(await podeUsar("prospeccao"))) notFound();
  const org = await getMinhaOrg();
  if (!org) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("agentes")
    .select("id, nome, token_final, ultimo_contato, created_at")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false });
  const agentes = (data as AgenteRow[] | null) ?? [];

  const url = process.env.NEXT_PUBLIC_APP_URL || "https://seu-site.com.br";
  const algumOnline = agentes.some((a) => online(a.ultimo_contato));

  return (
    <div className="painel-wrap flex flex-col gap-6">
      <div>
        <Link href="/app/prospeccao" className="text-sm text-paper-dim hover:text-paper">
          ← Prospecção
        </Link>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Meu agente 🤖</h1>
        <p className="mt-1 max-w-2xl text-sm text-paper-dim">
          A busca no Google e o envio no WhatsApp acontecem num programa que roda{" "}
          <b className="text-paper">no seu computador</b>, não no nosso servidor. É o que faz o
          WhatsApp ser o seu número e a busca sair do seu endereço de internet — sem dividir com
          mais ninguém.
        </p>
      </div>

      {/* estado */}
      <div className={cardClass}>
        {algumOnline ? (
          <p className="text-sm font-bold text-ok">✓ Agente ligado e conversando com o painel</p>
        ) : agentes.length > 0 ? (
          <>
            <p className="text-sm font-bold text-warn">⚠️ Nenhum agente ligado agora</p>
            <p className="mt-1 text-sm text-paper-dim">
              As buscas ficam esperando na fila e saem assim que você abrir o programa no seu
              computador.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-paper">Você ainda não instalou o agente</p>
            <p className="mt-1 text-sm text-paper-dim">
              Sem ele, a busca no Google e o envio no WhatsApp não funcionam. Leva uns 10 minutos,
              uma vez só.
            </p>
          </>
        )}
      </div>

      <NovoToken url={url} />

      {/* passo a passo */}
      <div>
        <h2 className="mb-3 text-sm font-bold">Como instalar</h2>
        <ol className="flex flex-col gap-3">
          {PASSOS.map((p, i) => (
            <li key={p.titulo} className="flex gap-3 rounded-xl border border-white/10 bg-ink-2 p-4">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand/20 text-sm font-bold text-brand-2">
                {i + 1}
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-paper">{p.titulo}</h3>
                {p.codigo ? (
                  <pre className="mt-1.5 overflow-x-auto rounded-lg bg-ink px-3 py-2 font-mono text-xs text-brand-2">
                    {p.texto}
                  </pre>
                ) : (
                  <p className="mt-1 text-sm text-paper-dim">{p.texto}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-paper-dim">
          Deixe a janela do terminal aberta enquanto estiver usando. Fechou, o agente para — e volta
          quando você abrir de novo. Nada se perde: a fila espera.
        </p>
      </div>

      {/* agentes criados */}
      {agentes.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-bold">Seus agentes</h2>
          <div className="flex flex-col gap-1.5">
            {agentes.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/10 px-3 py-2.5 text-xs"
              >
                <span
                  className={`h-2 w-2 flex-none rounded-full ${
                    online(a.ultimo_contato) ? "bg-ok" : "bg-white/20"
                  }`}
                />
                <span className="font-bold text-paper">{a.nome}</span>
                <span className="font-mono text-paper-dim/60">••••{a.token_final}</span>
                <span className="text-paper-dim">
                  {a.ultimo_contato
                    ? `visto ${new Date(a.ultimo_contato).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : "nunca conectou"}
                </span>
                <form action={apagarAgente.bind(null, a.id)} className="ml-auto">
                  <button
                    type="submit"
                    title="Desativa este código — o programa para de funcionar"
                    className="text-paper-dim transition hover:text-danger"
                  >
                    <IconTrash />
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
