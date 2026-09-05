import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { exigirProspeccao } from "@/lib/painel/permissoes";
import { modoProspector } from "@/lib/painel/prospector";
import Tutorial from "@/components/painel/Tutorial";
import Robo from "@/components/painel/Robo";
import Vigia from "../prospeccao/Vigia";
import { NAO_PRECISA, DEPOIS_DISSO } from "@/lib/painel/tutorial";
import { videoDaLanding } from "@/lib/landing";

export const dynamic = "force-dynamic";

/*
 * "Comece aqui" — a primeira tela de quem acabou de assinar.
 *
 * A tela do agente (/app/prospeccao/agente) responde "deu problema, e agora?";
 * esta responde "comprei, e agora?". São públicos diferentes: aqui a pessoa
 * ainda não sabe o que é o agente, e cada palavra a mais é uma chance de ela
 * fechar a aba e pedir reembolso.
 *
 * Por isso a tela se verifica sozinha: enquanto o agente não dá sinal, o
 * cabeçalho pergunta; no segundo em que ele aparece, a mesma tela vira o
 * "pronto, acabou" — sem F5, sem a pessoa precisar adivinhar se funcionou.
 */

function online(ultimo: string | null | undefined) {
  return !!ultimo && Date.now() - new Date(ultimo).getTime() < 15 * 60_000;
}

export default async function ComecarPage() {
  await exigirProspeccao();
  const org = await getMinhaOrg();
  if (!org) notFound();

  const supabase = await createClient();
  const [{ data: agentesRaw }, prospector, video] = await Promise.all([
    supabase.from("agentes").select("ultimo_contato").eq("org_id", org.id),
    modoProspector(),
    videoDaLanding("tutorial"),
  ]);
  const agentes = (agentesRaw as { ultimo_contato: string | null }[] | null) ?? [];
  const ativo = agentes.some((a) => online(a.ultimo_contato));
  const instalado = agentes.length > 0;

  return (
    <div className="painel-wrap flex flex-col gap-6">
      <Vigia modo={ativo ? "vigiando" : "esperando"} />

      <div className="anim-entrada">
        <Link href="/app" className="text-sm text-paper-dim hover:text-paper">
          ← Início
        </Link>
        <h1 className="mt-2 font-display text-3xl font-extrabold">
          Comece aqui 👋
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-paper-dim">
          São <b className="text-paper">quatro passos, uma vez só</b>, e uns dez minutos. Depois
          disso você nunca mais precisa mexer nisto — é ligar o computador e trabalhar.
        </p>
      </div>

      {/* --------------------- onde você está agora ---------------------- */}
      {ativo ? (
        <div className="anim-entrada d1 flex flex-wrap items-center gap-5 rounded-2xl border border-ok/40 bg-ok/10 p-6">
          <Robo estado="trabalhando" tamanho={72} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-extrabold text-ok">
              ✓ Pronto — seu agente está no ar
            </h2>
            <p className="mt-1 text-sm text-paper">
              A instalação acabou. Pode esquecer esta tela: daqui em diante ele liga junto com o
              computador, sozinho.
            </p>
          </div>
          <Link
            href="/app/prospeccao"
            className="flex-none rounded-xl bg-ok px-5 py-2.5 text-sm font-bold text-ink transition hover:-translate-y-0.5 hover:opacity-90"
          >
            Buscar minhas primeiras empresas →
          </Link>
        </div>
      ) : instalado ? (
        <div className="anim-entrada d1 flex flex-wrap items-center gap-5 rounded-2xl border border-warn/40 bg-warn/10 p-6">
          <Robo estado="dormindo" tamanho={72} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-extrabold text-warn">
              Quase lá — o agente está instalado, mas ainda não deu sinal
            </h2>
            <p className="mt-1 text-sm text-paper">
              Se você ainda não reiniciou o computador, é isso que falta (passo 3). Com pressa,
              clique em <b className="font-mono">LIGAR-AGENTE</b> dentro da pasta{" "}
              <b className="font-mono">paginapro-agente</b>.
            </p>
            <p className="mt-1 text-xs text-paper-dim">
              Esta tela percebe sozinha quando ele acordar — não precisa atualizar a página.
            </p>
          </div>
        </div>
      ) : (
        <div className="anim-entrada d1 flex flex-wrap items-center gap-5 rounded-2xl border border-white/10 bg-ink-2 p-6">
          <Robo estado="novo" tamanho={72} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-extrabold text-paper">
              Seu agente ainda não nasceu
            </h2>
            <p className="mt-1 max-w-xl text-sm text-paper">
              Ele é um programinha que mora no <b>seu computador</b>. É o que faz a busca sair do
              seu endereço de internet e a mensagem sair do <b>seu número</b> de WhatsApp — e não de
              um número de robô que ninguém responde.
            </p>
          </div>
        </div>
      )}

      {/*
        O vídeo, quando existe — ANTES dos passos escritos.
        Muita gente prefere ver alguém fazendo a instalar do que ler; quem
        prefere ler tem o passo a passo logo abaixo, completo. Um não
        substitui o outro: o texto é o que a pessoa consulta no meio da
        instalação, com a janela preta aberta do lado.
      */}
      {video && (
        <div className="anim-entrada overflow-hidden rounded-2xl border border-white/10 bg-ink-2">
          <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
            <iframe
              src={video.embedUrl}
              title="Como instalar o agente"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              className="absolute inset-0 h-full w-full"
            />
          </div>
          <p className="px-4 py-3 text-xs text-paper-dim">
            🎥 Assista uma vez e faça junto — abaixo estão os mesmos passos escritos, para consultar
            durante a instalação.
          </p>
        </div>
      )}

      {/* ---------------------------- os passos --------------------------- */}
      <Tutorial />

      {/* ------------------- o que você NÃO precisa fazer ----------------- */}
      <div className="anim-entrada rounded-2xl border border-white/10 bg-ink-2 p-5">
        <h2 className="font-display text-lg font-extrabold text-paper">
          E o que você <span className="text-ok">não</span> precisa fazer
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {NAO_PRECISA.map((t) => (
            <li key={t} className="flex gap-2 text-sm text-paper-dim">
              <span className="flex-none text-ok">✓</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ------------------------- e depois disso ------------------------- */}
      <div className="anim-entrada card-aurora rounded-2xl p-5">
        <h2 className="font-display text-lg font-extrabold text-paper">
          Terminou a instalação. Como fica o seu dia?
        </h2>
        <ol className="mt-3 flex flex-col gap-2">
          {DEPOIS_DISSO.map((t, i) => (
            <li key={t} className="flex gap-3 text-sm text-paper">
              <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-paper-dim">
                {i + 1}
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
        <Link
          href="/app/prospeccao"
          className="mt-4 inline-flex rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-brand-2"
        >
          {ativo ? "Ir para a prospecção →" : "Ver a tela de prospecção →"}
        </Link>
      </div>

      {/* --------------------------- deu problema ------------------------- */}
      <div className="anim-entrada rounded-2xl border border-white/10 bg-ink-2 p-5">
        <h2 className="text-sm font-bold text-paper">Travou em algum passo?</h2>
        <p className="mt-1 text-sm text-paper-dim">
          A tela do agente tem as respostas para os tropeços mais comuns — o aviso azul do Windows,
          o “desenvolvedor não identificado” do Mac, o Node, e o que o programa faz e não faz na sua
          máquina.
        </p>
        <Link
          href="/app/prospeccao/agente"
          className="mt-3 inline-flex rounded-lg border border-white/15 px-4 py-2 text-xs font-bold text-paper transition hover:border-brand-2 hover:text-brand-2"
        >
          Abrir a tela do agente →
        </Link>
        {prospector && (
          <p className="mt-3 text-xs text-paper-dim">
            Ainda com dúvida? Responda o e-mail da sua assinatura — a gente te ajuda a instalar.
          </p>
        )}
      </div>
    </div>
  );
}
