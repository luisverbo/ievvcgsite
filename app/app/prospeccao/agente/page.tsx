import Link from "next/link";
import { notFound } from "next/navigation";
import Abas from "../Abas";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { exigirProspeccao } from "@/lib/painel/permissoes";
import { apagarAgente, pedirAtualizacao } from "./actions";
import NovoToken from "./NovoToken";
import Tutorial from "@/components/painel/Tutorial";
import { IconTrash } from "@/components/painel/icons";
import { VERSAO_AGENTE } from "@/lib/agente/pacote";

export const dynamic = "force-dynamic";

type AgenteRow = {
  id: string;
  nome: string;
  token_final: string;
  ultimo_contato: string | null;
  created_at: string;
  // Colunas da migração 2026-09-06: ausentes = migração pendente ou agente antigo.
  versao?: string | null;
  versao_em?: string | null;
  atualizar_pedido?: boolean | null;
};

/*
 * O agente está na versão que o painel tem para entregar?
 *
 * "desconhecida" e null são agentes antigos (de antes de reportar versão):
 * contam como desatualizados, porque estão — e o botão não os alcança; a
 * primeira atualização deles é na mão (o aviso na tela explica).
 */
function situacaoVersao(a: AgenteRow): "atual" | "desatualizado" | "antigo" {
  if (!a.versao || a.versao === "desconhecida") return "antigo";
  return a.versao === VERSAO_AGENTE ? "atual" : "desatualizado";
}

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
  await exigirProspeccao();
  const org = await getMinhaOrg();
  if (!org) notFound();

  const supabase = await createClient();
  // select * de propósito: as colunas de versão são de migração nova, e
  // pedi-las pelo nome derrubaria a tela inteira em quem não rodou o SQL.
  const { data } = await supabase
    .from("agentes")
    .select("*")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false });
  const agentes = (data as AgenteRow[] | null) ?? [];

  const url = process.env.NEXT_PUBLIC_APP_URL || "https://seu-site.com.br";
  const algumOnline = agentes.some((a) => online(a.ultimo_contato));
  // Só agente LIGADO conta como desatualizado: o desligado não tem como saber.
  const ligados = agentes.filter((a) => online(a.ultimo_contato));
  const desatualizados = ligados.filter((a) => situacaoVersao(a) === "desatualizado");
  const antigos = ligados.filter((a) => situacaoVersao(a) === "antigo");

  return (
    <div className="painel-wrap flex flex-col gap-6">
      <div className="anim-entrada flex flex-col gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Meu agente 🤖</h1>
          <p className="mt-1 max-w-2xl text-sm text-paper-dim">
            A busca no Google e o envio no WhatsApp acontecem num programa que roda{" "}
            <b className="text-paper">no seu computador</b>, não no nosso servidor. É o que faz o
            WhatsApp ser o seu número e a busca sair do seu endereço de internet — sem dividir
            com mais ninguém.
          </p>
          <Link
            href="/app/comecar"
            className="mt-3 inline-flex rounded-lg border border-white/15 px-4 py-2 text-xs font-bold text-paper transition hover:border-brand-2 hover:text-brand-2"
          >
            👋 É a sua primeira vez? Comece pelo passo a passo guiado →
          </Link>
        </div>
        <Abas />
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

      {/*
        Versão: o aviso que substitui o "baixe o agente de novo" dito no
        escuro. Aparece só quando há agente ligado atrás da versão do painel —
        e o botão resolve sem SSH nem download.
      */}
      {(desatualizados.length > 0 || antigos.length > 0) && (
        <div className="rounded-xl border border-warn/40 bg-warn/10 p-5">
          <p className="font-display text-lg font-extrabold text-warn">
            🔄 Tem versão nova do agente
          </p>
          {desatualizados.length > 0 && (
            <p className="mt-1 text-sm text-paper">
              {desatualizados.length === 1
                ? `O agente "${desatualizados[0].nome}" está`
                : `${desatualizados.length} agentes estão`}{" "}
              numa versão anterior. Clique em <b>Atualizar</b> na lista aí embaixo: ele baixa o
              código novo e reinicia sozinho em até 5 minutos — na VPS o systemd religa; no
              Windows e no Mac, a janela do LIGAR-AGENTE religa. O WhatsApp continua conectado.
            </p>
          )}
          {antigos.length > 0 && (
            <p className="mt-1 text-sm text-paper-dim">
              {antigos.length === 1 ? `O agente "${antigos[0].nome}" é` : `${antigos.length} agentes são`}{" "}
              de antes de o painel saber versão — o botão ainda não os alcança. Uma vez na mão
              (na VPS: <code className="text-paper">git pull && systemctl restart paginapro-agente</code>;
              no computador: baixar o zip de novo) e daí em diante é só o botão.
            </p>
          )}
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

      {/*
        A VPS: o caminho de quem quer o agente 24h sem depender de computador
        ligado. Recolhido — é técnico, e a maioria instala no PC. Os comandos
        completos moram no README que vai dentro do próprio pacote.
      */}
      <details className="rounded-xl border border-white/10 bg-ink-2 p-4">
        <summary className="cursor-pointer text-sm font-bold text-paper-dim">
          🖥️ Rodar numa VPS (Linux), 24 horas por dia
        </summary>
        <div className="mt-3 flex flex-col gap-3 text-sm text-paper-dim">
          <p>
            Mesmo código, sem tela: o agente vira um serviço do sistema e volta sozinho quando a
            máquina reinicia. Serve para quem não quer deixar o computador ligado — o WhatsApp
            continua sendo o seu número, lido uma vez pelo QR.
          </p>
          <ol className="flex flex-col gap-1.5 pl-4 [&>li]:list-decimal">
            <li>
              Baixe o zip acima e descompacte na VPS (ex.: <code className="text-paper">/opt/paginapro-agente</code>).
              O <code className="text-paper">.env</code> já vai com o seu código dentro.
            </li>
            <li>
              Instale o Node 22 e o navegador:{" "}
              <code className="text-paper">cd agente && npm install && npx playwright install --with-deps chromium</code>
            </li>
            <li>
              Crie o serviço seguindo o <code className="text-paper">agente/README.md</code> (seção
              “Instalar na VPS”) e ligue: <code className="text-paper">systemctl enable --now paginapro-agente</code>
            </li>
          </ol>
          <p className="rounded-lg border border-brand-2/30 bg-brand/10 px-3 py-2.5">
            <b className="text-paper">Atualizar depois é pelo botão</b> na lista de agentes aí embaixo:
            o agente vê o pedido em até 5 minutos, puxa o código novo (por <code>git pull</code> se
            você clonou o repositório, ou baixando os arquivos do painel se usou o zip) e reinicia
            — o systemd religa na versão nova, e o WhatsApp não cai.
          </p>
        </div>
      </details>

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

                {/* a versão, e o botão que a corrige */}
                {(() => {
                  const s = situacaoVersao(a);
                  const ligado = online(a.ultimo_contato);
                  return (
                    <>
                      <span
                        title={a.versao ? `versão ${a.versao} · painel ${VERSAO_AGENTE}` : undefined}
                        className={`rounded-full px-2 py-0.5 font-bold ${
                          s === "atual"
                            ? "bg-ok/15 text-ok"
                            : s === "desatualizado"
                              ? "bg-warn/15 text-warn"
                              : "bg-white/10 text-paper-dim"
                        }`}
                      >
                        {s === "atual" ? "✓ atualizado" : s === "desatualizado" ? "versão anterior" : "versão desconhecida"}
                      </span>
                      {a.atualizar_pedido ? (
                        <span className="text-brand-2">🔄 atualização pedida — reinicia em até 5 min</span>
                      ) : (
                        ligado &&
                        s !== "antigo" && (
                          <form action={pedirAtualizacao.bind(null, a.id)}>
                            <button
                              type="submit"
                              title={
                                s === "atual"
                                  ? "Já está na versão do painel — força um reinício na mesma versão"
                                  : "Baixa a versão nova e reinicia sozinho, sem perder o WhatsApp"
                              }
                              className={`rounded-md px-2.5 py-1 font-bold transition ${
                                s === "desatualizado"
                                  ? "bg-brand text-white hover:bg-brand-2"
                                  : "border border-white/15 text-paper-dim hover:border-brand-2 hover:text-brand-2"
                              }`}
                            >
                              🔄 Atualizar
                            </button>
                          </form>
                        )
                      )}
                    </>
                  );
                })()}
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
