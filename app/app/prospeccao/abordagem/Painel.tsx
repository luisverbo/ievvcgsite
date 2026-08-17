"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelarMensagem,
  limparEnviadas,
  marcarEnviada,
  prepararAbordagem,
  conectarWhatsapp,
  desconectarWhatsapp,
  salvarBriefing,
  salvarConfig,
  salvarFechador,
  salvarFollowup,
  salvarResumo,
  type ConfigAbordagem,
  type EstadoAbordagem,
  type MensagemRow,
} from "./actions";
import { MODELO_PADRAO, MODELO_FOLLOWUP_PADRAO } from "@/lib/prospeccao/mensagem";
import { faixa, type ProspectoRow } from "@/lib/prospeccao/tipos";
import { acharNicho } from "@/lib/prospeccao/nichos";
import { inputClass, labelClass, cardClass } from "@/components/painel/ui";
import Robo from "@/components/painel/Robo";

// A primeira mensagem não precisa de etiqueta; as outras, sim — o usuário
// tem que saber que está olhando a SEGUNDA conversa com aquele lead.
const ROTULO_TIPO: Record<string, string> = {
  fechamento: "🤝 com o site",
  followup: "↩️ follow-up",
};

const ROTULO_MSG: Record<string, string> = {
  pendente: "Aguardando",
  enviada: "Enviada ✓",
  erro: "Falhou",
  cancelada: "Cancelada",
  sem_whatsapp: "Sem WhatsApp",
};

export default function Painel({
  config,
  candidatos,
  mensagens,
  nomePorProspecto,
  fechadorLigado = false,
  resumoLigado = false,
  cerebroLigado = false,
  followupLigado = false,
  placar = [],
}: {
  config: ConfigAbordagem;
  candidatos: ProspectoRow[];
  mensagens: MensagemRow[];
  nomePorProspecto: Record<string, string>;
  /* Interruptores do Admin: desligado, o card correspondente nem aparece. */
  fechadorLigado?: boolean;
  resumoLigado?: boolean;
  cerebroLigado?: boolean;
  followupLigado?: boolean;
  /* Conversão por origem da mensagem (modelo × IA) — o placar honesto. */
  placar?: { origem: string; enviadas: number; respostas: number }[];
}) {
  const router = useRouter();
  const [cfgEstado, salvarCfg, salvandoCfg] = useActionState<EstadoAbordagem, FormData>(
    salvarConfig,
    undefined,
  );
  const [filaEstado, prepararFila, preparando] = useActionState<EstadoAbordagem, FormData>(
    prepararAbordagem,
    undefined,
  );
  const [fechadorEstado, salvarFech, salvandoFech] = useActionState<EstadoAbordagem, FormData>(
    salvarFechador,
    undefined,
  );
  const [resumoEstado, salvarRes, salvandoRes] = useActionState<EstadoAbordagem, FormData>(
    salvarResumo,
    undefined,
  );
  const [briefingEstado, salvarBrief, salvandoBrief] = useActionState<EstadoAbordagem, FormData>(
    salvarBriefing,
    undefined,
  );
  const temBriefing = (config.briefing_msg ?? "").trim().length >= 40;
  const [estrategia, setEstrategia] = useState<"modelo" | "ia">("modelo");
  const [fupEstado, salvarFup, salvandoFup] = useActionState<EstadoAbordagem, FormData>(
    salvarFollowup,
    undefined,
  );
  const [fupLigado, setFupLigado] = useState(config.followup_ligado);
  const [nivelFech, setNivelFech] = useState(config.fechador_nivel);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  // Controlados para a tela mostrar, ao vivo, quanto tempo o envio vai levar —
  // é o que traduz "45 a 150 segundos" em algo que dá para decidir.
  const [limite, setLimite] = useState(config.limite_diario);
  const [minS, setMinS] = useState(config.intervalo_min_s);
  const [maxS, setMaxS] = useState(config.intervalo_max_s);
  const duracaoTotal = duracao(limite * ((minS + maxS) / 2));

  /*
   * Cada busca feita (nicho + local) vira um grupo. Sem isto, dentista,
   * advogado e psicólogo ficam no mesmo balaio e não dá para abordar só um
   * ramo de cada vez — que é como a venda realmente acontece.
   */
  const [pesquisa, setPesquisa] = useState("todas");
  const pesquisas = useMemo(() => {
    const mapa = new Map<string, { chave: string; rotulo: string; total: number }>();
    for (const c of candidatos) {
      const chave = `${c.nicho_busca ?? ""}|${c.local_busca ?? ""}`;
      const atual = mapa.get(chave);
      if (atual) atual.total++;
      else {
        const nicho = acharNicho(c.nicho_busca ?? "")?.rotulo ?? c.nicho_busca ?? "Sem nicho";
        mapa.set(chave, {
          chave,
          rotulo: c.local_busca ? `${nicho} · ${c.local_busca}` : nicho,
          total: 1,
        });
      }
    }
    return [...mapa.values()].sort((a, b) => b.total - a.total);
  }, [candidatos]);

  const visiveis = useMemo(
    () =>
      pesquisa === "todas"
        ? candidatos
        : candidatos.filter((c) => `${c.nicho_busca ?? ""}|${c.local_busca ?? ""}` === pesquisa),
    [candidatos, pesquisa],
  );

  const pendentes = mensagens.filter((m) => m.status === "pendente");
  const semi = pendentes.filter((m) => m.modo === "semi");
  const enviadasHoje = mensagens.filter(
    (m) => m.status === "enviada" && m.enviada_em && m.enviada_em > hojeInicio(),
  ).length;

  // Enquanto houver fila automática, acompanha o envio sem precisar recarregar.
  const temFilaAuto = pendentes.some((m) => m.modo === "auto");
  // Também durante a conexão: o QR chega do agente e só aparece se a página
  // recarregar sozinha (e ele muda a cada ~20s).
  const conectando = config.whatsapp_status === "aguardando_qr";
  useEffect(() => {
    if (!temFilaAuto && !conectando) return;
    const id = window.setInterval(() => router.refresh(), conectando ? 4000 : 10_000);
    return () => window.clearInterval(id);
  }, [temFilaAuto, conectando, router]);

  function alternar(id: string) {
    setMarcados((s) => {
      const novo = new Set(s);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  const corStatus =
    config.whatsapp_status === "conectado"
      ? "text-ok"
      : config.whatsapp_status === "erro"
        ? "text-danger"
        : "text-paper-dim";

  return (
    <div className="flex flex-col gap-6">
      {/*
        O agente conversando é o produto acontecendo — merece o palco de cima.
        Só aparece quando a fila automática está andando de verdade.
      */}
      {temFilaAuto && config.whatsapp_status === "conectado" && (
        <div className="anim-entrada card-aurora rounded-2xl p-5">
          <div className="flex flex-wrap items-center gap-4">
            <Robo estado="trabalhando" tamanho={64} />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg font-extrabold text-paper">
                Seu agente está no WhatsApp agora{" "}
                <span className="pp-pontinhos text-ok">
                  <span />
                  <span />
                  <span />
                </span>
              </h2>
              <p className="mt-0.5 text-sm text-paper-dim">
                <b className="text-paper">{pendentes.filter((m) => m.modo === "auto").length}</b> na
                fila · <b className="text-paper">{enviadasHoje}</b> de {config.limite_diario}{" "}
                enviadas hoje — no ritmo humano que você definiu. Pode fechar esta tela: ele segue
                sozinho.
              </p>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(4, Math.round((enviadasHoje / Math.max(1, config.limite_diario)) * 100)))}%`,
                    background: "linear-gradient(90deg, #2fbf8f, #8e7bff, #2fbf8f)",
                    backgroundSize: "200% 100%",
                    animation: "pp-aurora 2.4s linear infinite",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------- WhatsApp --------------------------- */}
      <div
        className={`anim-entrada d1 rounded-xl border bg-ink-2 p-5 ${
          config.whatsapp_status === "conectado"
            ? "border-ok/30"
            : config.whatsapp_status === "erro"
              ? "border-danger/40"
              : "border-white/10"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Robo
              estado={
                config.whatsapp_status === "conectado"
                  ? "trabalhando"
                  : config.whatsapp_status === "aguardando_qr"
                    ? "novo"
                    : "dormindo"
              }
              tamanho={48}
            />
            <div className="min-w-0">
              <h2 className="text-lg font-bold">
                WhatsApp do agente ·{" "}
                <span className={corStatus}>
                  {config.whatsapp_status === "conectado"
                    ? "conectado"
                    : config.whatsapp_status === "aguardando_qr"
                      ? "aguardando leitura do QR"
                      : config.whatsapp_status === "erro"
                        ? "com problema"
                        : "desconectado"}
                </span>
              </h2>
              {config.whatsapp_mensagem && (
                <p className="mt-0.5 text-sm text-paper-dim">{config.whatsapp_mensagem}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <form action={conectarWhatsapp}>
              <button
                type="submit"
                className={`rounded-lg px-5 py-2.5 text-sm font-bold transition ${
                  config.whatsapp_status === "conectado"
                    ? "border border-white/15 text-paper-dim hover:border-white/40 hover:text-paper"
                    : "bg-brand text-white hover:bg-brand-2"
                }`}
              >
                {config.whatsapp_status === "conectado" ? "Reconectar" : "Conectar WhatsApp"}
              </button>
            </form>
            <form action={desconectarWhatsapp}>
              <button
                type="submit"
                title="Apaga a sessão para você entrar com outro número"
                className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-bold text-paper-dim transition hover:border-danger hover:text-danger"
              >
                Desconectar
              </button>
            </form>
          </div>
        </div>

        {conectando && !config.whatsapp_qr && (
          <p className="mt-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-brand-2">
            Aguardando o agente abrir o WhatsApp… o QR aparece aqui em alguns segundos. Se não
            aparecer em 1 minuto, confira se o serviço está no ar na VPS.
          </p>
        )}

        {config.whatsapp_qr && config.whatsapp_status !== "conectado" && (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-xl bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={config.whatsapp_qr}
              alt="QR do WhatsApp"
              className="max-h-[420px] w-auto max-w-full rounded"
            />
            <p className="text-center text-xs text-black">
              WhatsApp no celular → <b>Aparelhos conectados</b> → <b>Conectar aparelho</b>
            </p>
          </div>
        )}

        <p className="mt-3 text-xs text-paper-dim">
          Use um <b className="text-paper">chip separado</b>, nunca o número que seus clientes já
          têm. Enviadas hoje: <b className="text-paper">{enviadasHoje}</b> de {config.limite_diario}.
        </p>
      </div>

      {/* ------------------------- a mensagem --------------------------- */}
      <form action={salvarCfg} className={`anim-entrada d2 ${cardClass}`}>
        <h2 className="mb-1 text-lg font-bold">A mensagem</h2>
        <p className="mb-3 text-sm text-paper-dim">
          Use <code className="text-paper">{"{empresa}"}</code>,{" "}
          <code className="text-paper">{"{ramo}"}</code>,{" "}
          <code className="text-paper">{"{bairro}"}</code>,{" "}
          <code className="text-paper">{"{prova}"}</code> (frase de avaliações, some sozinha se a
          empresa tiver poucas), <code className="text-paper">{"{regiao}"}</code>,{" "}
          <code className="text-paper">{"{meunome}"}</code> e{" "}
          <code className="text-paper">{"{contato}"}</code> (vira “, Dra. Juliana” quando o nome da
          pessoa está na placa; fica vazio quando não dá para saber, em vez de inventar). Para
          variar o texto,{" "}
          <code className="text-paper">[Oi|Olá|Opa]</code> sorteia uma opção a cada envio — é o que
          evita a mensagem parecer disparo.
        </p>
        <div className="mb-3">
          <label className={labelClass} htmlFor="remetente_nome">
            Seu nome (assina a mensagem)
          </label>
          <input
            id="remetente_nome"
            name="remetente_nome"
            defaultValue={config.remetente_nome ?? ""}
            placeholder="Luis"
            className={`${inputClass} w-full sm:w-64`}
          />
        </div>

        <textarea
          name="modelo_mensagem"
          defaultValue={config.modelo_mensagem || MODELO_PADRAO}
          rows={10}
          className={`${inputClass} w-full resize-y font-mono text-xs`}
        />

        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="font-bold">Ritmo do envio automático</h3>
          <p className="mt-1 text-xs text-paper-dim">
            Estes números só valem no modo automático. São eles que fazem o agente parecer uma
            pessoa mandando mensagem, e não um robô disparando.
          </p>

          <div className="mt-4">
            <label className={labelClass} htmlFor="limite_diario">
              Quantas mensagens por dia, no máximo
            </label>
            <input
              id="limite_diario"
              name="limite_diario"
              type="number"
              min={1}
              max={200}
              value={limite}
              onChange={(e) => setLimite(Number(e.target.value))}
              className={`${inputClass} mt-1 w-28`}
            />
            <p className="mt-1 text-xs text-paper-dim">
              Ao chegar nesse número o agente para sozinho e só volta no dia seguinte. Comece
              baixo: 15 a 20 nos primeiros dias.
            </p>
          </div>

          <div className="mt-4">
            <label className={labelClass}>Espera entre uma mensagem e a próxima</label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-sm text-paper-dim">de</span>
              <input
                name="intervalo_min_s"
                type="number"
                min={20}
                value={minS}
                onChange={(e) => setMinS(Number(e.target.value))}
                className={`${inputClass} w-24`}
              />
              <span className="text-sm text-paper-dim">até</span>
              <input
                name="intervalo_max_s"
                type="number"
                min={30}
                value={maxS}
                onChange={(e) => setMaxS(Number(e.target.value))}
                className={`${inputClass} w-24`}
              />
              <span className="text-sm text-paper-dim">
                <b className="text-paper">segundos</b> ({emMinutos(minS)} a {emMinutos(maxS)})
              </span>
            </div>
            <p className="mt-1 text-xs text-paper-dim">
              A cada envio o agente sorteia um tempo diferente entre esses dois. Intervalo fixo
              (sempre 60s, por exemplo) é assinatura de robô — ninguém manda mensagem em tempo
              cravado.
            </p>
          </div>

          <p className="mt-4 rounded-lg border border-brand-2/30 bg-brand/10 px-3 py-2.5 text-sm">
            📊 Do jeito que está: <b className="text-paper">{limite} mensagens</b> por dia, uma a
            cada <b className="text-paper">{emMinutos(Math.round((minS + maxS) / 2))}</b> em média.
            Vão levar cerca de <b className="text-paper">{duracaoTotal}</b> para todas saírem.
            {minS < 30 && (
              <span className="mt-1 block text-danger">
                ⚠️ Menos de 30 segundos é arriscado — é aí que o WhatsApp costuma bloquear.
              </span>
            )}
          </p>
        </div>

        <button
          type="submit"
          disabled={salvandoCfg}
          className="mt-4 rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
        >
          {salvandoCfg ? "Salvando…" : "Salvar mensagem e limites"}
        </button>
        {cfgEstado?.error && <p className="mt-2 text-sm text-danger">{cfgEstado.error}</p>}
        {cfgEstado?.ok && <p className="mt-2 text-sm text-ok">{cfgEstado.ok}</p>}
      </form>

      {/* ------------------------ follow-up ------------------------------ */}
      {followupLigado && (
        <form action={salvarFup} className={`anim-entrada d2 ${cardClass}`}>
          <div className="flex flex-wrap items-center gap-3">
            <Robo estado={fupLigado ? "trabalhando" : "dormindo"} tamanho={44} />
            <div className="min-w-0">
              <h2 className="text-lg font-bold">Follow-up automático ↩️</h2>
              <p className="text-sm text-paper-dim">
                A maioria dos leads não diz “não” — só esquece. Quem ficar em silêncio recebe{" "}
                <b className="text-paper">uma segunda mensagem, uma única vez</b>, no mesmo ritmo
                humano. Quem respondeu ou pediu para não receber nunca entra.
              </p>
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/10 px-3 py-2.5 transition hover:border-white/25">
            <input
              type="checkbox"
              name="followup_ligado"
              value="1"
              checked={fupLigado}
              onChange={(e) => setFupLigado(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-none accent-[var(--color-brand)]"
            />
            <span className="text-sm text-paper">
              Ligar o follow-up
              <span className="mt-0.5 block text-xs text-paper-dim">
                Vale para quem foi abordado nos últimos 30 dias. Mensagem mais antiga que isso não
                é retomada — chegaria como “quem é você?”.
              </span>
            </span>
          </label>

          {fupLigado && (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <label className={labelClass} htmlFor="followup_dias">
                  Mandar depois de
                </label>
                <input
                  id="followup_dias"
                  name="followup_dias"
                  type="number"
                  min={2}
                  max={30}
                  defaultValue={config.followup_dias}
                  className={`${inputClass} w-20 text-center`}
                />
                <span className="text-sm text-paper-dim">dias sem resposta</span>
              </div>

              <div className="mt-4">
                <label className={labelClass} htmlFor="followup_msg">
                  A segunda mensagem (mesmas variáveis e {"[a|b]"} da primeira)
                </label>
                <textarea
                  id="followup_msg"
                  name="followup_msg"
                  rows={5}
                  defaultValue={config.followup_msg_modelo || MODELO_FOLLOWUP_PADRAO}
                  className={`${inputClass} mt-1 w-full resize-y font-mono text-xs`}
                />
                <p className="mt-1 text-xs text-paper-dim">
                  Deixe a saída fácil no texto (“é só me dizer e eu não incomodo mais”): quem
                  responde “não” vira opt-out na hora e some das filas — melhor isso do que virar
                  denúncia de spam.
                </p>
              </div>
            </>
          )}

          {!fupLigado && (
            <>
              <input type="hidden" name="followup_dias" value={config.followup_dias} />
              <input type="hidden" name="followup_msg" value={config.followup_msg_modelo ?? ""} />
            </>
          )}

          <button
            type="submit"
            disabled={salvandoFup}
            className="mt-4 rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
          >
            {salvandoFup ? "Salvando…" : "Salvar follow-up"}
          </button>
          {fupEstado?.error && <p className="mt-2 text-sm text-danger">{fupEstado.error}</p>}
          {fupEstado?.ok && <p className="mt-2 text-sm text-ok">✅ {fupEstado.ok}</p>}
        </form>
      )}

      {/* -------------------- mensagens com cérebro ---------------------- */}
      {cerebroLigado && (
        <form action={salvarBrief} className="anim-entrada d2 card-aurora rounded-xl p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Robo estado={temBriefing ? "trabalhando" : "novo"} tamanho={44} />
            <div>
              <h2 className="text-lg font-bold">Mensagens com cérebro 🧠</h2>
              <p className="text-sm text-paper-dim">
                Em vez do seu modelo, a IA escreve uma mensagem{" "}
                <b className="text-paper">diferente para cada lead</b> — citando o ramo, o bairro,
                as avaliações. Mensagem única não tem cara de disparo: protege seu número e
                converte mais.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label className={labelClass} htmlFor="briefing_msg">
              Seu briefing (quem você é, o que oferece, o tom da conversa)
            </label>
            <textarea
              id="briefing_msg"
              name="briefing_msg"
              rows={4}
              defaultValue={config.briefing_msg ?? ""}
              placeholder="Ex.: Sou o Luis, crio sites profissionais para negócios locais do Rio. Ofereço uma demonstração pronta antes de falar de qualquer valor. Tom leve e direto, sem parecer vendedor insistente."
              className={`${inputClass} mt-1 w-full resize-y text-xs`}
            />
          </div>

          <p className="mt-3 rounded-lg border border-brand-2/30 bg-brand/10 px-3 py-2.5 text-xs text-paper-dim">
            💡 <b className="text-paper">Quanto custa:</b> ~US$0,002 por mensagem, do seu crédito de
            IA — 50 leads saem por menos de US$0,10. As regras de segurança são fixas: a primeira
            mensagem nunca leva link nem preço, só pede permissão.
          </p>

          {(() => {
            const meu = placar.find((p) => p.origem === "modelo");
            const ia = placar.find((p) => p.origem === "ia");
            if (!meu && !ia) return null;
            const pct = (p?: { enviadas: number; respostas: number }) =>
              p && p.enviadas > 0 ? Math.round((p.respostas / p.enviadas) * 100) : null;
            const linha = (rotulo: string, p?: { enviadas: number; respostas: number }) =>
              p && p.enviadas > 0 ? (
                <span>
                  {rotulo}: <b className="text-paper">{pct(p)}%</b>{" "}
                  <span className="text-paper-dim">
                    ({p.respostas} {p.respostas === 1 ? "resposta" : "respostas"} em {p.enviadas})
                  </span>
                </span>
              ) : null;
            const poucaAmostra = (meu?.enviadas ?? 0) < 10 || (ia?.enviadas ?? 0) < 10;
            return (
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs">
                <span className="font-bold text-paper">📊 Placar das mensagens</span>
                {linha("Seu modelo", meu)}
                {linha("IA 🧠", ia)}
                {poucaAmostra && (
                  <span className="text-paper-dim">
                    (com menos de 10 envios de cada lado, ainda é cedo para cravar um vencedor)
                  </span>
                )}
              </p>
            );
          })()}

          <button
            type="submit"
            disabled={salvandoBrief}
            className="mt-4 rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
          >
            {salvandoBrief ? "Salvando…" : "Salvar briefing"}
          </button>
          {briefingEstado?.error && (
            <p className="mt-2 text-sm text-danger">{briefingEstado.error}</p>
          )}
          {briefingEstado?.ok && <p className="mt-2 text-sm text-ok">✅ {briefingEstado.ok}</p>}
        </form>
      )}

      {/* ------------------------- o Fechador ---------------------------- */}
      {fechadorLigado && (
        <form action={salvarFech} className="anim-entrada d2 card-aurora rounded-xl p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Robo estado={nivelFech === "desligado" ? "novo" : "trabalhando"} tamanho={44} />
            <div>
              <h2 className="text-lg font-bold">O Fechador 🤝</h2>
              <p className="text-sm text-paper-dim">
                Quando um lead responder com interesse, o agente pode gerar o site dele — com as
                fotos do Instagram — e mandar o link na mesma conversa. Você escolhe até onde ele
                vai sozinho.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(
              [
                {
                  valor: "desligado",
                  rotulo: "Desligado",
                  desc: "O agente só marca quem respondeu. Nada além disso.",
                },
                {
                  valor: "avisar",
                  rotulo: "Só me avisar",
                  desc: "O painel destaca a resposta classificada — você faz o resto.",
                },
                {
                  valor: "preparar",
                  rotulo: "Preparar o site ⭐",
                  desc: "Gera o site sozinho e deixa a mensagem PRONTA — você revisa e envia com 1 clique.",
                },
                {
                  valor: "fechar",
                  rotulo: "Fechar sozinho",
                  desc: "Gera E envia o link na conversa, sem você. Exige o de acordo abaixo.",
                },
              ] as const
            ).map((n) => (
              <label
                key={n.valor}
                className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition ${
                  nivelFech === n.valor
                    ? "border-brand-2 bg-brand/15"
                    : "border-white/10 hover:border-white/25"
                }`}
              >
                <input
                  type="radio"
                  name="fechador_nivel"
                  value={n.valor}
                  checked={nivelFech === n.valor}
                  onChange={() => setNivelFech(n.valor)}
                  className="mt-1 h-4 w-4 flex-none accent-[var(--color-brand)]"
                />
                <span>
                  <span className="block text-sm font-bold text-paper">{n.rotulo}</span>
                  <span className="mt-0.5 block text-xs text-paper-dim">{n.desc}</span>
                </span>
              </label>
            ))}
          </div>

          {nivelFech === "fechar" && !config.fechador_autorizado_em && (
            <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2.5">
              <input
                type="checkbox"
                name="autorizo"
                value="1"
                className="mt-0.5 h-4 w-4 flex-none accent-[var(--color-brand)]"
              />
              <span className="text-xs text-paper">
                Autorizo o agente a <b>enviar mensagens sozinho</b> no meu WhatsApp quando um lead
                responder com interesse — no máximo uma por lead, sempre com o site junto.
              </span>
            </label>
          )}

          {(nivelFech === "preparar" || nivelFech === "fechar") && (
            <>
              <div className="mt-4">
                <label className={labelClass} htmlFor="fechador_msg">
                  A mensagem que acompanha o site ({"{empresa}"} e {"{link}"} são trocados na hora)
                </label>
                <textarea
                  id="fechador_msg"
                  name="fechador_msg"
                  rows={3}
                  defaultValue={
                    config.fechador_msg_modelo ??
                    "Que bom! 😊 Preparei uma prévia rápida para a {empresa}, já com as fotos de vocês: {link}\n\nDá uma olhada e me diz o que achou — qualquer ajuste é rápido de fazer."
                  }
                  className={`${inputClass} mt-1 w-full resize-y text-xs`}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className={labelClass} htmlFor="fechador_teto">
                  Gastar no máximo
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-paper-dim">US$</span>
                  <input
                    id="fechador_teto"
                    name="fechador_teto"
                    inputMode="decimal"
                    defaultValue={(config.fechador_teto_micro / 1_000_000).toString()}
                    className={`${inputClass} w-20 text-center`}
                  />
                  <span className="text-sm text-paper-dim">por mês em sites automáticos</span>
                </div>
              </div>

              <p className="mt-3 rounded-lg border border-brand-2/30 bg-brand/10 px-3 py-2.5 text-xs text-paper-dim">
                💡 <b className="text-paper">Quanto custa:</b> cada site automático sai do seu
                crédito de IA (~US$0,55 — só é gerado para quem <b className="text-paper">já
                respondeu com interesse</b>, o melhor lead possível). As fotos são as do Instagram
                do lead: custo zero. Gasto neste mês:{" "}
                <b className="text-paper">
                  US$ {(config.fechador_gasto_micro / 1_000_000).toFixed(2).replace(".", ",")}
                </b>{" "}
                de US$ {(config.fechador_teto_micro / 1_000_000).toFixed(0)} — bateu o teto, ele
                para e avisa.
              </p>
            </>
          )}

          {nivelFech !== "preparar" && nivelFech !== "fechar" && (
            <>
              {/* os campos continuam viajando para o servidor mesmo escondidos */}
              <input type="hidden" name="fechador_msg" value={config.fechador_msg_modelo ?? ""} />
              <input
                type="hidden"
                name="fechador_teto"
                value={(config.fechador_teto_micro / 1_000_000).toString()}
              />
            </>
          )}

          <button
            type="submit"
            disabled={salvandoFech}
            className="mt-4 rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
          >
            {salvandoFech ? "Salvando…" : "Salvar o Fechador"}
          </button>
          {fechadorEstado?.error && (
            <p className="mt-2 text-sm text-danger">{fechadorEstado.error}</p>
          )}
          {fechadorEstado?.ok && <p className="mt-2 text-sm text-ok">✅ {fechadorEstado.ok}</p>}
        </form>
      )}

      {/* ---------------------- resumo diário ---------------------------- */}
      {resumoLigado && (
        <form action={salvarRes} className={`anim-entrada d2 ${cardClass}`}>
          <div className="flex flex-wrap items-center gap-3">
            <Robo estado={config.resumo_zap ? "trabalhando" : "dormindo"} tamanho={44} />
            <div>
              <h2 className="text-lg font-bold">Resumo diário 📬</h2>
              <p className="text-sm text-paper-dim">
                No fim do dia, o agente te manda pelo WhatsApp o balanço do trabalho: enviadas,
                respostas, sites entregues e quem abriu o site (🔥). Dia parado não gera mensagem —
                quando o resumo chegar, é porque teve novidade.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div>
              <label className={labelClass} htmlFor="resumo_zap">
                Mandar para (seu celular com DDD)
              </label>
              <input
                id="resumo_zap"
                name="resumo_zap"
                defaultValue={config.resumo_zap ?? ""}
                placeholder="(21) 99999-8888"
                className={`${inputClass} mt-1 w-52`}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="resumo_hora">
                A partir das
              </label>
              <select
                id="resumo_hora"
                name="resumo_hora"
                defaultValue={config.resumo_hora}
                className={`${inputClass} mt-1 w-24`}
              >
                {Array.from({ length: 17 }, (_, i) => i + 6).map((h) => (
                  <option key={h} value={h}>
                    {h}h
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={salvandoRes}
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
            >
              {salvandoRes ? "Salvando…" : "Salvar resumo"}
            </button>
          </div>

          <p className="mt-3 text-xs text-paper-dim">
            Pode ser o próprio número conectado do agente — aí o resumo cai na conversa{" "}
            <b className="text-paper">“você”</b> do seu WhatsApp. Para desligar, apague o número e
            salve.
          </p>
          {resumoEstado?.error && <p className="mt-2 text-sm text-danger">{resumoEstado.error}</p>}
          {resumoEstado?.ok && <p className="mt-2 text-sm text-ok">✅ {resumoEstado.ok}</p>}
        </form>
      )}

      {/* ------------------------- escolher ----------------------------- */}
      <form action={prepararFila} className={`anim-entrada d3 ${cardClass}`}>
        <h2 className="mb-1 text-lg font-bold">Quem abordar ({candidatos.length} disponíveis)</h2>
        <p className="mb-3 text-sm text-paper-dim">
          Só aparecem empresas com celular e que ainda não foram abordadas, da maior nota para a
          menor.
        </p>

        {pesquisas.length > 1 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setPesquisa("todas")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                pesquisa === "todas"
                  ? "bg-brand text-white"
                  : "border border-white/15 text-paper-dim hover:border-white/40 hover:text-paper"
              }`}
            >
              Todas ({candidatos.length})
            </button>
            {pesquisas.map((p) => (
              <button
                key={p.chave}
                type="button"
                onClick={() => setPesquisa(p.chave)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  pesquisa === p.chave
                    ? "bg-brand text-white"
                    : "border border-white/15 text-paper-dim hover:border-white/40 hover:text-paper"
                }`}
              >
                {p.rotulo} ({p.total})
              </button>
            ))}
          </div>
        )}

        <div className="mb-2 flex flex-wrap items-center gap-3 text-xs">
          <button
            type="button"
            onClick={() => setMarcados(new Set(visiveis.map((c) => c.id)))}
            className="font-bold text-brand-2 underline transition hover:text-paper"
          >
            Marcar as {visiveis.length} desta lista
          </button>
          {marcados.size > 0 && (
            <button
              type="button"
              onClick={() => setMarcados(new Set())}
              className="text-paper-dim underline transition hover:text-paper"
            >
              limpar seleção
            </button>
          )}
        </div>

        <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
          {visiveis.length === 0 && (
            <p className="text-sm text-paper-dim">
              {candidatos.length === 0
                ? "Nenhuma empresa disponível. Faça uma busca na aba Prospecção primeiro."
                : "Nenhuma empresa nesta pesquisa — todas já foram abordadas."}
            </p>
          )}
          {visiveis.map((p) => {
            const fx = faixa(p.pontuacao);
            return (
              <label
                key={p.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 px-3 py-2 transition hover:border-white/25"
              >
                <input
                  type="checkbox"
                  name="prospecto"
                  value={p.id}
                  checked={marcados.has(p.id)}
                  onChange={() => alternar(p.id)}
                  className="h-4 w-4 flex-none accent-[var(--color-brand)]"
                />
                <span className={`w-8 flex-none text-sm font-extrabold ${fx.classe}`}>
                  {p.pontuacao}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{p.nome}</span>
                <span className="flex-none text-xs text-paper-dim">{p.telefone}</span>
              </label>
            );
          })}
        </div>

        {cerebroLigado && (
          <div className="mt-4 flex flex-wrap gap-2">
            <input type="hidden" name="estrategia" value={estrategia} />
            {(
              [
                {
                  valor: "modelo" as const,
                  rotulo: "Usar meu modelo",
                  desc: "O texto lá de cima, com as variações [a|b].",
                },
                {
                  valor: "ia" as const,
                  rotulo: "🧠 IA escreve uma por lead",
                  desc: temBriefing
                    ? `Uma mensagem única para cada — ~US$${(Math.max(1, marcados.size) * 0.002).toFixed(2).replace(".", ",")} no total.`
                    : "Preencha o briefing no card 🧠 primeiro.",
                },
              ]
            ).map((e) => {
              const bloqueada = e.valor === "ia" && !temBriefing;
              return (
                <label
                  key={e.valor}
                  className={`flex items-start gap-2 rounded-xl border px-3 py-2 transition ${
                    bloqueada
                      ? "cursor-not-allowed border-white/5 opacity-50"
                      : estrategia === e.valor
                        ? "cursor-pointer border-brand-2 bg-brand/15"
                        : "cursor-pointer border-white/10 hover:border-white/25"
                  }`}
                >
                  <input
                    type="radio"
                    checked={estrategia === e.valor}
                    disabled={bloqueada}
                    onChange={() => setEstrategia(e.valor)}
                    className="mt-0.5 h-4 w-4 flex-none accent-[var(--color-brand)]"
                  />
                  <span>
                    <span className="block text-xs font-bold text-paper">{e.rotulo}</span>
                    <span className="mt-0.5 block text-[11px] text-paper-dim">{e.desc}</span>
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-paper-dim">{marcados.size} selecionadas</span>
          <button
            type="submit"
            name="modo"
            value="semi"
            disabled={preparando || marcados.size === 0}
            className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-bold text-paper transition hover:border-white/40 disabled:opacity-50"
          >
            Preparar para eu enviar
          </button>
          <button
            type="submit"
            name="modo"
            value="auto"
            disabled={preparando || marcados.size === 0}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-50"
          >
            {preparando
              ? estrategia === "ia"
                ? "🧠 A IA está escrevendo…"
                : "Enfileirando…"
              : "Enviar automático"}
          </button>
        </div>
        {filaEstado?.error && <p className="mt-2 text-sm text-danger">{filaEstado.error}</p>}
        {filaEstado?.ok && <p className="mt-2 text-sm text-ok">✅ {filaEstado.ok}</p>}
      </form>

      {/* ------------------------- semi: enviar ------------------------- */}
      {semi.length > 0 && (
        <div className={`anim-entrada d2 ${cardClass}`}>
          <h2 className="mb-3 text-lg font-bold">Prontas para você enviar ({semi.length})</h2>
          <div className="flex flex-col gap-2">
            {semi.map((m) => (
              <div key={m.id} className="rounded-lg border border-white/10 p-3">
                <p className="mb-1 text-sm font-bold">
                  {nomePorProspecto[m.prospecto_id] ?? "Empresa"}{" "}
                  <span className="font-normal text-paper-dim">· {m.telefone}</span>
                  {m.tipo && m.tipo !== "abordagem" && (
                    <span className="ml-2 rounded-md bg-brand/20 px-1.5 py-0.5 text-[10px] font-bold text-brand-2">
                      {ROTULO_TIPO[m.tipo]}
                    </span>
                  )}
                </p>
                <p className="whitespace-pre-line rounded-md bg-black/30 p-2.5 text-xs text-paper-dim">
                  {m.texto}
                </p>
                <div className="mt-2 flex gap-2">
                  <a
                    href={`https://wa.me/${m.telefone}?text=${encodeURIComponent(m.texto)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-ok/20 px-4 py-2 text-xs font-bold text-ok transition hover:bg-ok/30"
                  >
                    Abrir no WhatsApp →
                  </a>
                  <form action={marcarEnviada.bind(null, m.id)}>
                    <button
                      type="submit"
                      className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-paper-dim transition hover:border-white/40 hover:text-paper"
                    >
                      Já enviei
                    </button>
                  </form>
                  <form action={cancelarMensagem.bind(null, m.id)}>
                    <button
                      type="submit"
                      className="rounded-lg px-3 py-2 text-xs text-paper-dim transition hover:text-danger"
                    >
                      descartar
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --------------------------- histórico -------------------------- */}
      {mensagens.length > 0 && (
        <div className={`anim-entrada d4 ${cardClass}`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Histórico</h2>
            <form action={limparEnviadas}>
              <button
                type="submit"
                className="text-xs text-paper-dim underline transition hover:text-paper"
              >
                limpar finalizadas
              </button>
            </form>
          </div>
          <div className="flex flex-col gap-1.5">
            {mensagens.slice(0, 40).map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/10 px-3 py-2 text-xs"
              >
                <span className="font-bold text-paper">
                  {nomePorProspecto[m.prospecto_id] ?? m.telefone}
                </span>
                {m.tipo && m.tipo !== "abordagem" && (
                  <span className="text-brand-2">{ROTULO_TIPO[m.tipo]}</span>
                )}
                <span
                  className={
                    m.status === "enviada"
                      ? "text-ok"
                      : m.status === "erro" || m.status === "sem_whatsapp"
                        ? "text-danger"
                        : "text-paper-dim"
                  }
                >
                  {ROTULO_MSG[m.status]}
                </span>
                <span className="text-paper-dim">{m.modo === "auto" ? "automático" : "manual"}</span>
                {m.erro && <span className="text-danger">{m.erro}</span>}
                <span className="ml-auto text-paper-dim">
                  {new Date(m.enviada_em ?? m.created_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function hojeInicio() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// "45" -> "45 segundos"; "150" -> "2min30"
function emMinutos(segundos: number) {
  if (!Number.isFinite(segundos) || segundos <= 0) return "—";
  if (segundos < 60) return `${segundos} segundos`;
  const min = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return resto === 0 ? `${min}min` : `${min}min${String(resto).padStart(2, "0")}`;
}

// Tempo total do lote, em linguagem de gente.
function duracao(segundos: number) {
  if (!Number.isFinite(segundos) || segundos <= 0) return "—";
  const min = Math.round(segundos / 60);
  if (min < 60) return `${min} minutos`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} hora${h > 1 ? "s" : ""}` : `${h}h${String(m).padStart(2, "0")}`;
}
