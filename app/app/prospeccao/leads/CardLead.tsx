import Link from "next/link";
import {
  capturarInstagram,
  etiquetarDoForm,
  excluirProspecto,
  lembreteDoForm,
  marcarLembrete,
  mudarEtiqueta,
  gerarSiteParaProspecto,
  mudarStatus,
  pedirEspelho,
} from "../actions";
import RespostasProntas from "../RespostasProntas";
import {
  faixa,
  ROTULO_SITUACAO,
  ROTULO_STATUS,
  type ProspectoRow,
  type StatusProspecto,
} from "@/lib/prospeccao/tipos";
import { usuarioInstagramDe, IG_LIMITE_DIA } from "@/lib/prospeccao/instagram";
import { IconTrash } from "@/components/painel/icons";

/*
 * O card de um lead — desenhado para ser LIDO, não decifrado.
 *
 * A versão anterior mostrava tudo o tempo todo: nove botões, três linhas de
 * chips, os motivos da nota, a resposta, o lembrete. Um vendedor olhando
 * sessenta cards precisa de três coisas de relance — quem é, se dá para
 * chamar, e em que pé está — e o resto só quando pedir.
 *
 * Então a hierarquia é esta:
 *   1. o nome, grande, e a reputação (nota + avaliações) como selo à esquerda;
 *   2. uma linha só de contato: telefone, WhatsApp confirmado, Maps, site;
 *   3. UM botão visível (WhatsApp) e o resto atrás do "⋯";
 *   4. o que é urgente aparece só quando existe: a resposta que chegou, o
 *      termômetro, o "não perturbar", o lembrete de hoje;
 *   5. as etiquetas no rodapé, discretas, a um clique.
 */

const CHIP_STATUS: Record<StatusProspecto, string> = {
  novo: "",
  contactado: "bg-brand/20 text-brand-2",
  respondeu: "bg-ok/15 text-ok",
  fechou: "bg-ok/25 text-ok",
  descartado: "bg-white/10 text-paper-dim",
};

const ROTULO_CLASSE: Record<string, { rotulo: string; classe: string }> = {
  interesse: { rotulo: "🎯 interessado", classe: "bg-ok/15 text-ok" },
  preco: { rotulo: "💰 perguntou o preço", classe: "bg-warn/15 text-warn" },
  duvida: { rotulo: "❓ tem dúvida", classe: "bg-brand/20 text-brand-2" },
  recusa: { rotulo: "🚫 recusou", classe: "bg-danger/15 text-danger" },
  outro: { rotulo: "💬 respondeu", classe: "bg-white/10 text-paper-dim" },
};

const ETIQUETAS_RAPIDAS = ["🔥 quente", "🌡️ morno", "❄️ frio"];

function haQuanto(iso: string, agora: number) {
  const min = Math.max(1, Math.round((agora - new Date(iso).getTime()) / 60_000));
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.round(h / 24)} dia${h >= 48 ? "s" : ""}`;
}

// Só o WhatsApp de celular vale link direto; fixo não tem.
function linkWhatsapp(telefone: string | null) {
  if (!telefone) return null;
  const d = telefone.replace(/\D/g, "");
  if (!/9\d{8}$/.test(d)) return null;
  return `https://wa.me/${d.startsWith("55") ? d : `55${d}`}`;
}

export type ContextoCard = {
  podeSites: boolean;
  espelhoLigado: boolean;
  igOcupado: boolean;
  igNoLimite: boolean;
  hojeBr: string;
  /** Um só "agora" para todos os cards da página — evita relógio dentro do render. */
  agora: number;
  respostasRapidas: { t: string; x: string }[];
};

export default function CardLead({
  p,
  ctx,
  resposta,
  abertura,
  atraso,
}: {
  p: ProspectoRow;
  ctx: ContextoCard;
  resposta?: { texto: string; classe: string | null; em: string; tipo?: string | null };
  abertura?: { total: number; ultima: string };
  atraso: number;
}) {
  const zap = linkWhatsapp(p.telefone);
  const fx = faixa(p.pontuacao);
  const quente = abertura && ctx.agora - new Date(abertura.ultima).getTime() < 24 * 3_600_000;
  const lembreteHoje = !!p.lembrete_em && p.lembrete_em <= ctx.hojeBr;
  const igTentavel =
    !!usuarioInstagramDe(p) &&
    (!p.ig_capturado_em || p.ig_status === "bloqueado" || p.ig_status === "erro");
  const visualResposta = resposta
    ? (ROTULO_CLASSE[resposta.classe ?? "outro"] ?? ROTULO_CLASSE.outro)
    : null;

  // Cor da borda esquerda acompanha o estágio — é a mesma linguagem do funil.
  const borda =
    p.status === "fechou"
      ? "#2fbf8f"
      : p.status === "respondeu"
        ? "#a78bfa"
        : p.status === "contactado"
          ? "#f5b76b"
          : p.status === "descartado"
            ? "rgba(255,255,255,.12)"
            : "#6c5ce7";

  const itemMenu =
    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold text-paper-dim transition hover:bg-white/8 hover:text-paper";

  return (
    <article
      className={`anim-entrada d${Math.min(atraso + 1, 6)} rounded-2xl border border-white/10 bg-ink-2 transition hover:border-white/20`}
      style={{ borderLeft: `4px solid ${borda}` }}
    >
      <div className="flex gap-4 p-4">
        {/* ---------------- selo: reputação (ou nota de site) ---------------- */}
        <div className="hidden w-16 flex-none flex-col items-center justify-center rounded-xl bg-white/[0.04] py-2 text-center sm:flex">
          {ctx.podeSites ? (
            <>
              <span className={`font-display text-2xl font-extrabold tabular-nums leading-none ${fx.classe}`}>
                {p.pontuacao}
              </span>
              <span className="mt-1 text-[10px] font-bold leading-tight text-paper-dim">{fx.rotulo}</span>
            </>
          ) : (
            <>
              <span className="font-display text-2xl font-extrabold tabular-nums leading-none text-paper">
                {p.nota_media ? String(p.nota_media).replace(".", ",") : "—"}
                {p.nota_media && <span className="ml-0.5 text-sm text-warn">★</span>}
              </span>
              <span className="mt-1 text-[10px] font-bold leading-tight text-paper-dim">
                {p.avaliacoes ? `${p.avaliacoes} aval.` : "sem aval."}
              </span>
            </>
          )}
        </div>

        {/* ------------------------------ corpo ------------------------------ */}
        <div className="min-w-0 flex-1">
          {/* linha 1: nome, categoria, estágio — e as ações à direita */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-bold leading-tight text-paper">{p.nome}</h3>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-paper-dim">
                {ctx.podeSites ? (
                  <span>{ROTULO_SITUACAO[p.situacao]}</span>
                ) : (
                  p.categoria && <span>{p.categoria}</span>
                )}
                {p.status !== "novo" && (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${CHIP_STATUS[p.status]}`}>
                    {ROTULO_STATUS[p.status]}
                  </span>
                )}
                {p.etiqueta && (
                  <span className="rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-[11px] font-bold text-warn">
                    🏷️ {p.etiqueta}
                  </span>
                )}
                {p.lembrete_em && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      lembreteHoje ? "anim-pulso-ok bg-danger/15 text-danger" : "bg-brand/10 text-brand-2"
                    }`}
                  >
                    ⏰{" "}
                    {lembreteHoje
                      ? "hoje"
                      : new Date(`${p.lembrete_em}T12:00:00`).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                  </span>
                )}
                {/* no celular o selo some; a nota entra aqui, pequena */}
                <span className="sm:hidden">
                  {ctx.podeSites
                    ? `${fx.emoji} ${p.pontuacao}`
                    : p.nota_media
                      ? `⭐ ${String(p.nota_media).replace(".", ",")}${p.avaliacoes ? ` · ${p.avaliacoes}` : ""}`
                      : null}
                </span>
              </p>
            </div>

            {/* ações: uma visível, o resto no menu */}
            <div className="flex flex-none items-center gap-1.5">
              {zap && !p.nao_perturbar && (
                <a
                  href={zap}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:brightness-110"
                >
                  WhatsApp
                </a>
              )}
              <details className="relative">
                <summary
                  aria-label="Mais ações"
                  className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg border border-white/10 text-paper-dim transition hover:border-white/25 hover:text-paper [&::-webkit-details-marker]:hidden"
                >
                  ⋯
                </summary>
                <div className="absolute right-0 top-full z-30 mt-1 w-52 rounded-xl border border-white/15 bg-ink-2 p-1.5 shadow-2xl">
                  <form
                    action={mudarStatus.bind(
                      null,
                      p.id,
                      (p.status === "novo" ? "contactado" : "novo") as StatusProspecto,
                    )}
                  >
                    <button type="submit" className={itemMenu}>
                      {p.status === "novo" ? "✓ Marcar como contactado" : "↺ Voltar para novo"}
                    </button>
                  </form>
                  {(p.status === "contactado" || p.status === "respondeu") && (
                    <form action={mudarStatus.bind(null, p.id, "fechou" as StatusProspecto)}>
                      <button type="submit" className={`${itemMenu} text-ok hover:text-ok`}>
                        🎉 Fechou
                      </button>
                    </form>
                  )}
                  {p.status !== "descartado" && (
                    <form action={mudarStatus.bind(null, p.id, "descartado" as StatusProspecto)}>
                      <button type="submit" className={itemMenu}>
                        ⛔ Descartar
                      </button>
                    </form>
                  )}

                  {ctx.podeSites && (
                    <>
                      <div className="my-1 border-t border-white/10" />
                      {p.site_ia_id ? (
                        <Link href={`/app/ia/${p.site_ia_id}`} className={itemMenu}>
                          ✨ Ver o site gerado
                        </Link>
                      ) : (
                        <form action={gerarSiteParaProspecto.bind(null, p.id)}>
                          <button type="submit" className={`${itemMenu} text-brand-2 hover:text-brand-2`}>
                            ✨ Gerar site
                          </button>
                        </form>
                      )}
                      {igTentavel &&
                        (ctx.igOcupado || ctx.igNoLimite ? (
                          <span
                            className={`${itemMenu} cursor-default opacity-50`}
                            title={
                              ctx.igOcupado
                                ? "O agente lê um perfil por vez, com intervalo — é o que evita o bloqueio do Instagram."
                                : `Teto de ${IG_LIMITE_DIA} perfis por dia. Amanhã libera.`
                            }
                          >
                            📸 {ctx.igOcupado ? "Instagram: aguarde a vez" : "Instagram: limite do dia"}
                          </span>
                        ) : (
                          <form action={capturarInstagram.bind(null, p.id)}>
                            <button type="submit" className={itemMenu}>
                              📸 {p.ig_capturado_em ? "Tentar Instagram de novo" : "Buscar Instagram"}
                            </button>
                          </form>
                        ))}
                      {ctx.espelhoLigado && p.website && !p.espelho_url && (
                        <form action={pedirEspelho.bind(null, p.id)}>
                          <button type="submit" className={itemMenu}>
                            🪞 Print do site atual
                          </button>
                        </form>
                      )}
                    </>
                  )}

                  <div className="my-1 border-t border-white/10" />
                  <form action={excluirProspecto.bind(null, p.id)}>
                    <button type="submit" className={`${itemMenu} hover:text-danger`}>
                      <IconTrash size={13} /> Remover da lista
                    </button>
                  </form>
                </div>
              </details>
            </div>
          </div>

          {/* linha 2: endereço */}
          {p.endereco && (
            <p className="mt-1.5 truncate text-xs text-paper-dim" title={p.endereco}>
              📍 {p.endereco}
            </p>
          )}

          {/* linha 3: contato — uma linha, tudo que precisa para agir */}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {p.telefone && <span className="font-semibold text-paper">📞 {p.telefone}</span>}
            {p.whatsapp_ok === true && (
              <span title="O WhatsApp abriu a conversa com este número" className="font-bold text-ok">
                ✓ WhatsApp
              </span>
            )}
            {p.whatsapp_ok === false && (
              <span title="O WhatsApp disse que este número não está lá" className="font-bold text-danger">
                ✕ sem WhatsApp
              </span>
            )}
            {p.fonte_url && (
              <a href={p.fonte_url} target="_blank" rel="noreferrer" className="text-paper-dim hover:text-paper hover:underline">
                Maps ↗
              </a>
            )}
            {p.website && (
              <a
                href={p.website}
                target="_blank"
                rel="noreferrer"
                className="max-w-44 truncate text-paper-dim hover:text-paper hover:underline"
              >
                {p.website.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗
              </a>
            )}
            {p.instagram && (
              <a href={p.instagram} target="_blank" rel="noreferrer" className="text-brand-2 hover:underline">
                Instagram ↗
              </a>
            )}
            {ctx.espelhoLigado && p.espelho_url && p.site_ia_id && p.link_codigo && (
              <a
                href={`/espelho/${p.link_codigo}`}
                target="_blank"
                rel="noreferrer"
                title="A página de comparação: o site atual ao lado do novo"
                className="font-bold text-brand-2 hover:underline"
              >
                🪞 hoje × amanhã ↗
              </a>
            )}
          </p>

          {/* ------------ o que é urgente, só quando existe ------------ */}
          {(abertura || resposta || p.nao_perturbar) && (
            <div className="mt-2.5 flex flex-col gap-1.5">
              {abertura && (
                <p
                  className={`inline-flex w-fit items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-bold ${
                    quente ? "anim-pulso-ok border-warn/50 bg-warn/10 text-warn" : "border-white/10 bg-white/5 text-paper-dim"
                  }`}
                >
                  {quente ? "🔥" : "👀"} abriu o site {abertura.total === 1 ? "1 vez" : `${abertura.total} vezes`} ·{" "}
                  {haQuanto(abertura.ultima, ctx.agora)}
                  {quente && <span className="font-extrabold"> — liga agora!</span>}
                </p>
              )}
              {/*
                Resposta ao GANCHO ("tudo bem e você?"): ainda não é conversa
                para assumir — a apresentação vai sozinha. Aparece discreta,
                sem a caixa verde nem as respostas prontas, para o vendedor
                não pular em cima de um "oi".
              */}
              {resposta?.tipo === "gancho" && (
                <p className="inline-flex w-fit items-center gap-2 rounded-lg border border-brand-2/30 bg-brand/10 px-2.5 py-1 text-xs">
                  <span className="font-bold text-brand-2">👋 respondeu ao gancho</span>
                  <span className="text-paper-dim">· apresentação a caminho</span>
                  <span className="max-w-[16rem] truncate italic text-paper-dim">“{resposta.texto}”</span>
                </p>
              )}
              {resposta && resposta.tipo !== "gancho" && visualResposta && (
                <div className="rounded-lg border border-ok/30 bg-ok/5 p-2.5">
                  <p className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-bold ${visualResposta.classe}`}>
                      {visualResposta.rotulo}
                    </span>
                    <span className="text-paper-dim">
                      {new Date(resposta.em).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </p>
                  <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs italic text-paper">“{resposta.texto}”</p>
                  <RespostasProntas respostas={ctx.respostasRapidas} empresa={p.nome} />
                </div>
              )}
              {p.nao_perturbar && (
                <p className="text-xs font-bold text-danger">
                  🚫 Pediu para não receber mais mensagens — o agente respeita sozinho.
                </p>
              )}
            </div>
          )}

          {/* --------- extras do modo Agência: motivos e Instagram ---------- */}
          {ctx.podeSites && p.motivos.length > 0 && (
            <p className="mt-2 truncate text-[11px] text-paper-dim/80" title={p.motivos.join(" · ")}>
              {p.motivos.slice(0, 2).join(" · ")}
            </p>
          )}
          {ctx.podeSites && p.ig_status === "ok" && p.ig_fotos.length > 0 && (
            <div className="mt-2 flex gap-1 overflow-x-auto">
              {p.ig_fotos.slice(0, 6).map((f, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={f.url} alt="" className="h-10 w-10 flex-none rounded-md object-cover" />
              ))}
            </div>
          )}

          {/* ---------------------- rodapé: etiquetas ---------------------- */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-2.5 text-[11px]">
            {ETIQUETAS_RAPIDAS.map((t) => {
              const ativa = p.etiqueta === t;
              return (
                <form key={t} action={mudarEtiqueta.bind(null, p.id, ativa ? null : t)}>
                  <button
                    type="submit"
                    title={ativa ? "Tirar a etiqueta" : `Marcar como ${t}`}
                    className={`rounded-full border px-2.5 py-1 font-semibold transition ${
                      ativa
                        ? "border-warn/60 bg-warn/15 text-warn"
                        : "border-white/10 text-paper-dim hover:border-warn/50 hover:text-warn"
                    }`}
                  >
                    {t}
                  </button>
                </form>
              );
            })}
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-full border border-white/10 px-2.5 py-1 font-semibold text-paper-dim transition hover:border-warn/50 hover:text-warn [&::-webkit-details-marker]:hidden">
                ✏️ outra
              </summary>
              <form
                action={etiquetarDoForm.bind(null, p.id)}
                className="absolute left-0 top-full z-20 mt-1 flex gap-1 rounded-lg border border-white/15 bg-ink-2 p-1.5 shadow-xl"
              >
                <input
                  name="etiqueta"
                  maxLength={30}
                  placeholder="ex.: ligar sexta"
                  className="w-36 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-paper outline-none focus:border-warn/50"
                />
                <button type="submit" className="rounded-md bg-brand px-2.5 py-1 text-xs font-bold text-white transition hover:bg-brand-2">
                  OK
                </button>
              </form>
            </details>
            {p.etiqueta && !ETIQUETAS_RAPIDAS.includes(p.etiqueta) && (
              <form action={mudarEtiqueta.bind(null, p.id, null)}>
                <button
                  type="submit"
                  title="Tirar a etiqueta"
                  className="rounded-full border border-white/10 px-2 py-1 text-paper-dim transition hover:border-danger/50 hover:text-danger"
                >
                  🏷️ {p.etiqueta} ✕
                </button>
              </form>
            )}

            <span className="mx-1 h-4 w-px bg-white/10" />

            {p.lembrete_em ? (
              <form action={marcarLembrete.bind(null, p.id, null)}>
                <button
                  type="submit"
                  title="Tirar o lembrete"
                  className="rounded-full border border-white/10 px-2.5 py-1 font-semibold text-paper-dim transition hover:border-danger/50 hover:text-danger"
                >
                  ⏰ tirar lembrete
                </button>
              </form>
            ) : (
              <details className="relative">
                <summary className="cursor-pointer list-none rounded-full border border-white/10 px-2.5 py-1 font-semibold text-paper-dim transition hover:border-brand-2/50 hover:text-brand-2 [&::-webkit-details-marker]:hidden">
                  ⏰ lembrar
                </summary>
                <div className="absolute left-0 top-full z-20 mt-1 flex items-center gap-1 rounded-lg border border-white/15 bg-ink-2 p-1.5 shadow-xl">
                  {[
                    [1, "amanhã"],
                    [3, "+3d"],
                    [7, "+7d"],
                  ].map(([d, rotulo]) => (
                    <form key={d} action={marcarLembrete.bind(null, p.id, Number(d))}>
                      <button
                        type="submit"
                        className="rounded-md border border-white/10 px-2 py-1 text-xs font-bold text-paper-dim transition hover:border-brand-2/50 hover:text-brand-2"
                      >
                        {rotulo}
                      </button>
                    </form>
                  ))}
                  <form action={lembreteDoForm.bind(null, p.id)} className="flex gap-1">
                    <input
                      type="date"
                      name="data"
                      className="rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 text-xs text-paper outline-none [color-scheme:dark]"
                    />
                    <button type="submit" className="rounded-md bg-brand px-2 py-1 text-xs font-bold text-white transition hover:bg-brand-2">
                      OK
                    </button>
                  </form>
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
