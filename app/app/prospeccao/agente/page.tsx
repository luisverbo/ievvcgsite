import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { podeUsar } from "@/lib/painel/permissoes";
import { apagarAgente } from "./actions";
import NovoToken from "./NovoToken";
import Tutorial from "@/components/painel/Tutorial";
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

/*
 * Online = deu sinal nos últimos 15 minutos.
 *
 * Não é folga à toa: entre uma mensagem de WhatsApp e outra o agente espera
 * de propósito (às vezes 7, 8 minutos), e nesse tempo ele não fala com o
 * painel. Com uma janela curta, um agente trabalhando normalmente apareceria
 * como desligado.
 */
function online(ultimo: string | null) {
  return !!ultimo && Date.now() - new Date(ultimo).getTime() < 15 * 60_000;
}

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
        <Link
          href="/app/comecar"
          className="mt-3 inline-flex rounded-lg border border-white/15 px-4 py-2 text-xs font-bold text-paper transition hover:border-brand-2 hover:text-brand-2"
        >
          👋 É a sua primeira vez? Comece pelo passo a passo guiado →
        </Link>
      </div>

      {/* estado — quem já instalou precisa LIGAR, não instalar de novo */}
      {algumOnline ? (
        <div className="rounded-xl border border-ok/40 bg-ok/10 p-5">
          <p className="font-display text-lg font-extrabold text-ok">
            ✓ Agente ligado e conversando com o painel
          </p>
          <p className="mt-1 text-sm text-paper-dim">
            Pode fechar esta tela e ir buscar empresas — está tudo funcionando.
          </p>
        </div>
      ) : agentes.length > 0 ? (
        <div className="rounded-xl border border-warn/40 bg-warn/10 p-5">
          <p className="font-display text-lg font-extrabold text-warn">
            ⏸ O agente está instalado, mas desligado
          </p>
          <p className="mt-2 text-sm text-paper">
            Não precisa instalar de novo. Abra a pasta{" "}
            <b className="font-mono">paginapro-agente</b> no seu computador e clique duas vezes em{" "}
            <b className="font-mono text-paper">LIGAR-AGENTE</b> — a janela preta abre e o painel
            reconhece em alguns segundos.
          </p>
          <p className="mt-2 text-sm text-paper-dim">
            As buscas que você pedir ficam na fila e saem sozinhas quando ele ligar.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-brand-2/40 bg-brand/10 p-5">
          <p className="font-display text-lg font-extrabold text-paper">
            🤖 Você ainda não instalou o agente
          </p>
          <p className="mt-1 text-sm text-paper-dim">
            Sem ele, a busca no Google e o envio no WhatsApp não funcionam. Leva uns 10 minutos, uma
            vez só — e o passo a passo está logo abaixo.
          </p>
        </div>
      )}

      {/* download — o caminho principal, um clique */}
      <div className="rounded-xl border border-brand-2/40 bg-brand/10 p-5">
        <h2 className="text-sm font-bold text-paper">Baixar o agente</h2>
        <p className="mt-1 text-sm text-paper-dim">
          O arquivo já vem <b className="text-paper">com o seu código dentro</b> e com o instalador
          pronto. Você não digita comando nenhum — descompacta e clica duas vezes.
        </p>
        <a
          href="/app/prospeccao/agente/baixar"
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2"
        >
          ⬇ Baixar o agente (.zip)
        </a>
        <p className="mt-2 text-xs text-paper-dim">
          Funciona no Windows e no Mac. Serve para os dois — o instalador certo já está lá dentro.
        </p>
        <p className="mt-2 text-xs text-paper-dim">
          Não compartilhe o arquivo: dentro dele vai o código que dá acesso à sua conta.
        </p>
      </div>

      {/* caminho alternativo, para quem já tem a pasta */}
      <details className="rounded-xl border border-white/10 bg-ink-2 p-4">
        <summary className="cursor-pointer text-sm font-bold text-paper-dim">
          Já tenho a pasta do agente — só quero um código novo
        </summary>
        <div className="mt-3">
          <NovoToken url={url} />
        </div>
      </details>

      {/* passo a passo */}
      <div>
        <h2 className="mb-1 text-sm font-bold">
          {algumOnline ? "Instalar em outro computador" : "Como instalar"}
        </h2>
        {algumOnline && (
          <p className="mb-3 text-xs text-paper-dim">
            Seu agente já está ligado — estes passos são só se você quiser rodar em outra máquina.
          </p>
        )}
        {/* O botão de baixar já está logo acima, no card azul. */}
        <Tutorial comDownload={false} />
        <p className="mt-3 text-xs text-paper-dim">
          Fechou a janela, o agente para — e volta quando você abrir de novo, ou no próximo reinício
          do computador. Nada se perde: a fila espera por ele.
        </p>
        <p className="mt-1.5 text-xs text-paper-dim">
          Prefere ligar na mão? Clique em <b className="font-mono">DESLIGAR-INICIO-AUTOMATICO</b>{" "}
          dentro da pasta e o agente volta a esperar o seu clique — o INSTALAR-AGENTE religa o
          automático se mudar de ideia.
        </p>

        {/* O Node só aparece se der problema — antes disso é detalhe técnico. */}
        <details className="mt-4 rounded-xl border border-white/10 bg-ink-2 p-4">
          <summary className="cursor-pointer text-sm font-bold text-paper-dim">
            A janela preta pediu para instalar o Node — o que é isso?
          </summary>
          <div className="mt-3 text-sm text-paper-dim">
            <p>
              O Node é um programa gratuito da comunidade, o mesmo que roda por trás de meio
              milhão de sites. O agente precisa dele para funcionar, e normalmente o próprio
              instalador resolve para você. Se preferir instalar na mão, baixe a{" "}
              <b className="text-paper">versão LTS</b> (a recomendada, do lado esquerdo da página):
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="https://nodejs.org/en/download"
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-white/15 px-4 py-2 text-xs font-bold text-paper transition hover:border-brand-2 hover:text-brand-2"
              >
                🪟 Baixar para Windows
              </a>
              <a
                href="https://nodejs.org/en/download"
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-white/15 px-4 py-2 text-xs font-bold text-paper transition hover:border-brand-2 hover:text-brand-2"
              >
                 Baixar para Mac
              </a>
            </div>
            <p className="mt-3 text-xs text-paper-dim/70">
              Na página, escolha o seu sistema e clique no instalador. Depois de instalar, feche a
              janela preta e clique em INSTALAR-AGENTE de novo.
            </p>
          </div>
        </details>

        {/* Os avisos de primeira execução: Windows e Mac assustam de propósito. */}
        <details className="mt-2 rounded-xl border border-white/10 bg-ink-2 p-4">
          <summary className="cursor-pointer text-sm font-bold text-paper-dim">
            Apareceu um aviso azul “O Windows protegeu o computador”
          </summary>
          <p className="mt-3 text-sm text-paper-dim">
            É o aviso padrão do Windows para qualquer programa novo, de qualquer empresa — não
            significa que há algo errado. Clique em{" "}
            <b className="text-paper">Mais informações</b> e depois em{" "}
            <b className="text-paper">Executar assim mesmo</b>. Acontece só na primeira vez.
          </p>
        </details>

        <details className="mt-2 rounded-xl border border-white/10 bg-ink-2 p-4">
          <summary className="cursor-pointer text-sm font-bold text-paper-dim">
            Estou no Mac e apareceu “desenvolvedor não identificado”
          </summary>
          <p className="mt-3 text-sm text-paper-dim">
            É o aviso padrão do Mac para qualquer programa baixado fora da App Store. Clique com o{" "}
            <b className="text-paper">botão direito</b> no arquivo INSTALAR-AGENTE.command, escolha{" "}
            <b className="text-paper">Abrir</b> e confirme <b className="text-paper">Abrir</b> na
            janela que aparecer. Acontece só na primeira vez.
          </p>
        </details>

        {/*
          Segurança — de propósito AQUI, recolhida, e não na landing: na hora
          da venda esse assunto planta medo; na hora de instalar, ele responde
          a dúvida de quem já comprou. Cada afirmação abaixo é verificável no
          código que vai dentro do próprio .zip.
        */}
        <details className="mt-2 rounded-xl border border-ok/25 bg-ok/5 p-4">
          <summary className="cursor-pointer text-sm font-bold text-paper-dim">
            🔒 O que este programa faz — e o que ele NÃO faz
          </summary>
          <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="font-bold text-ok">✓ O que ele faz</p>
              <ul className="mt-1.5 flex flex-col gap-1.5 text-paper-dim">
                <li>• Pesquisa empresas no Google Maps, como uma pessoa pesquisaria</li>
                <li>• Envia e lê mensagens no SEU WhatsApp, no ritmo que você configurou</li>
                <li>• Pergunta ao painel o que fazer — e só faz o que você pediu lá</li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-danger">✕ O que ele nunca faz</p>
              <ul className="mt-1.5 flex flex-col gap-1.5 text-paper-dim">
                <li>• Não lê seus arquivos, fotos, e-mails nem senhas</li>
                <li>• Não aceita conexão de fora — nem a nossa. Ele só fala, não escuta</li>
                <li>• Não instala nada escondido: desinstalar é apagar a pasta</li>
              </ul>
            </div>
          </div>
          <p className="mt-4 rounded-lg border border-white/10 bg-black/25 p-3 text-xs text-paper-dim">
            A conexão do seu WhatsApp fica gravada <b className="text-paper">só no seu
            computador</b> — nós nunca vemos sua senha. E o código-fonte do agente vai{" "}
            <b className="text-paper">aberto e legível</b> dentro da pasta: qualquer pessoa de
            confiança pode conferir linha por linha o que ele faz.
          </p>
        </details>
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
