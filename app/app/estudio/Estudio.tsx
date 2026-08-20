"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  aprovarProjeto,
  colarTiktok,
  criarRoteiro,
  criarRoteiroDeVideo,
  dissecarSelecionados,
  excluirAchado,
  excluirFormula,
  excluirProjeto,
  garimpar,
  salvarModelos,
  voltarParaEdicao,
  type EstadoEstudio,
} from "./actions";
import type { AchadoRow, FormulaRow, ProjetoRow } from "./page";
import { inputClass, labelClass, cardClass } from "@/components/painel/ui";
import { IconTrash } from "@/components/painel/icons";
import Robo from "@/components/painel/Robo";

/*
 * A tela do Estúdio, Etapa 1: garimpo → seleção → dissecação → fórmulas.
 *
 * O número que manda aqui é o SCORE DE OUTLIER (views ÷ média do canal):
 * 40x num canal de bairro diz mais sobre o CONTEÚDO do que 1M de views num
 * canal que sempre faz 1M. A tabela nasce ordenada por ele.
 */

const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("pt-BR"));

const ROTULO_STATUS: Record<string, { rotulo: string; classe: string }> = {
  rascunho: { rotulo: "rascunho", classe: "bg-white/10 text-paper-dim" },
  roteiro_pronto: { rotulo: "aguardando sua aprovação", classe: "bg-warn/15 text-warn" },
  na_fila: { rotulo: "na fila", classe: "bg-brand/20 text-brand-2" },
  gerando: { rotulo: "gerando…", classe: "bg-brand/20 text-brand-2" },
  pronto: { rotulo: "pronto ✓", classe: "bg-ok/15 text-ok" },
  erro: { rotulo: "falhou", classe: "bg-danger/15 text-danger" },
};

function corDoScore(s: number | null): string {
  if (s == null) return "text-paper-dim";
  if (s >= 10) return "text-ok";
  if (s >= 3) return "text-warn";
  return "text-paper-dim";
}

export default function Estudio({
  achados,
  formulas,
  projetos,
  modeloDissecacao,
  modeloRoteiro,
}: {
  achados: AchadoRow[];
  formulas: FormulaRow[];
  projetos: ProjetoRow[];
  modeloDissecacao: string;
  modeloRoteiro: string;
}) {
  const router = useRouter();
  const [garimpoEstado, rodarGarimpo, garimpando] = useActionState<EstadoEstudio, FormData>(
    garimpar,
    undefined,
  );
  const [tkEstado, rodarTiktok, colando] = useActionState<EstadoEstudio, FormData>(
    colarTiktok,
    undefined,
  );
  const [dissecEstado, rodarDissec, dissecando] = useActionState<EstadoEstudio, FormData>(
    dissecarSelecionados,
    undefined,
  );
  const [cfgEstado, salvarCfg, salvandoCfg] = useActionState<EstadoEstudio, FormData>(
    salvarModelos,
    undefined,
  );

  const [roteiroEstado, rodarRoteiro, escrevendo] = useActionState<EstadoEstudio, FormData>(
    criarRoteiro,
    undefined,
  );
  const [aprovEstado, rodarAprovar, aprovando] = useActionState<EstadoEstudio, FormData>(
    aprovarProjeto,
    undefined,
  );
  const [adaptEstado, rodarAdaptar, adaptando] = useActionState<EstadoEstudio, FormData>(
    criarRoteiroDeVideo,
    undefined,
  );

  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [temaAtivo, setTemaAtivo] = useState("todos");
  // Qual vídeo está com a transcrição aberta (um por vez).
  const [aberto, setAberto] = useState<string | null>(null);

  /*
   * Enquanto houver vídeo na fila ou renderizando, a tela se atualiza
   * sozinha: o progresso chega da máquina que está renderizando, e ficar
   * apertando F5 para ver "40%" seria trabalho manual à toa.
   */
  const trabalhando = projetos.some((p) => p.status === "na_fila" || p.status === "gerando");
  useEffect(() => {
    if (!trabalhando) return;
    const id = window.setInterval(() => router.refresh(), 10_000);
    return () => window.clearInterval(id);
  }, [trabalhando, router]);

  const temas = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const a of achados) mapa.set(a.tema, (mapa.get(a.tema) ?? 0) + 1);
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [achados]);

  const visiveis = useMemo(() => {
    const lista = temaAtivo === "todos" ? achados : achados.filter((a) => a.tema === temaAtivo);
    return [...lista].sort((a, b) => (b.score_outlier ?? 0) - (a.score_outlier ?? 0));
  }, [achados, temaAtivo]);

  function alternar(id: string) {
    setMarcados((s) => {
      const novo = new Set(s);
      if (novo.has(id)) novo.delete(id);
      else if (novo.size < 5) novo.add(id);
      return novo;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------ garimpo ------------------------------ */}
      <form action={rodarGarimpo} className={`anim-entrada d1 ${cardClass}`}>
        <h2 className="mb-1 text-lg font-bold">🔎 Garimpar no YouTube</h2>
        <p className="mb-4 text-sm text-paper-dim">
          O score de outlier é views ÷ média do canal: <b className="text-paper">40x num canal
          pequeno</b> diz mais sobre o conteúdo do que 1M de views num canal que sempre faz 1M.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <label className={labelClass} htmlFor="tema">
              Tema / nicho
            </label>
            <input
              id="tema"
              name="tema"
              placeholder="ex.: renda extra com sites"
              className={`${inputClass} mt-1 w-full`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="min_views">
              Mín. de views
            </label>
            <input
              id="min_views"
              name="min_views"
              type="number"
              defaultValue={10_000}
              className={`${inputClass} mt-1 w-28`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="periodo">
              Últimos (dias)
            </label>
            <input
              id="periodo"
              name="periodo"
              type="number"
              defaultValue={90}
              className={`${inputClass} mt-1 w-24`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="duracao">
              Duração
            </label>
            <select id="duracao" name="duracao" className={`${inputClass} mt-1 w-32`}>
              <option value="curto">Shorts (&lt;60s)</option>
              <option value="qualquer">Qualquer</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={garimpando}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
          >
            {garimpando ? "Garimpando…" : "Garimpar"}
          </button>
        </div>
        {garimpoEstado?.error && <p className="mt-2 text-sm text-danger">{garimpoEstado.error}</p>}
        {garimpoEstado?.ok && <p className="mt-2 text-sm text-ok">✅ {garimpoEstado.ok}</p>}

        {/* TikTok manual: oEmbed oficial e gratuito; transcrição colada na mão. */}
        <details className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <summary className="cursor-pointer list-none text-sm font-bold text-paper-dim transition hover:text-paper [&::-webkit-details-marker]:hidden">
            + Colar um TikTok na mão (garimpo automático de TikTok não existe de graça)
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <input
                name="url"
                form="form-tiktok"
                placeholder="https://www.tiktok.com/@usuario/video/…"
                className={`${inputClass} min-w-0 flex-1`}
              />
              <input
                name="tema"
                form="form-tiktok"
                placeholder="tema (para agrupar)"
                className={`${inputClass} w-44`}
              />
            </div>
            <textarea
              name="transcricao"
              form="form-tiktok"
              rows={2}
              placeholder="Transcrição (opcional — cole se tiver; melhora muito a dissecação)"
              className={`${inputClass} w-full resize-y text-xs`}
            />
            <button
              type="submit"
              form="form-tiktok"
              disabled={colando}
              className="self-start rounded-lg border border-white/15 px-4 py-2 text-xs font-bold text-paper-dim transition hover:border-brand-2 hover:text-brand-2 disabled:opacity-60"
            >
              {colando ? "Lendo…" : "Adicionar TikTok"}
            </button>
            {tkEstado?.error && <p className="text-sm text-danger">{tkEstado.error}</p>}
            {tkEstado?.ok && <p className="text-sm text-ok">✅ {tkEstado.ok}</p>}
          </div>
        </details>
      </form>
      {/* O form do TikTok vive fora do form do garimpo (HTML não deixa aninhar). */}
      <form id="form-tiktok" action={rodarTiktok} className="hidden" />

      {/* ------------------------------ achados ------------------------------ */}
      {achados.length > 0 && (
        <form action={rodarDissec} className={`anim-entrada d2 ${cardClass}`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Vídeos garimpados ({visiveis.length})</h2>
            {temas.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setTemaAtivo("todos")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                    temaAtivo === "todos"
                      ? "bg-brand text-white"
                      : "border border-white/15 text-paper-dim hover:text-paper"
                  }`}
                >
                  Todos
                </button>
                {temas.map(([t, qtd]) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTemaAtivo(t)}
                    className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                      temaAtivo === t
                        ? "bg-brand text-white"
                        : "border border-white/15 text-paper-dim hover:text-paper"
                    }`}
                  >
                    {t} ({qtd})
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex max-h-[520px] flex-col gap-1.5 overflow-y-auto">
            {visiveis.map((a) => (
              <div key={a.id} className="flex flex-col gap-1.5">
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition ${
                  marcados.has(a.id) ? "border-brand-2 bg-brand/10" : "border-white/10 hover:border-white/25"
                }`}
              >
                <input
                  type="checkbox"
                  name="achado"
                  value={a.id}
                  checked={marcados.has(a.id)}
                  onChange={() => alternar(a.id)}
                  className="h-4 w-4 flex-none accent-[var(--color-brand)]"
                />
                <span className={`w-14 flex-none text-right font-display text-lg font-extrabold tabular-nums ${corDoScore(a.score_outlier)}`}>
                  {a.score_outlier != null ? `${a.score_outlier}x` : a.fonte === "tiktok" ? "TT" : "—"}
                </span>
                <span className="min-w-0 flex-1">
                  <a
                    href={a.url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="block truncate text-sm font-bold text-paper hover:underline"
                  >
                    {a.titulo ?? "(sem título)"} ↗
                  </a>
                  <span className="block truncate text-xs text-paper-dim">
                    {a.canal ?? "?"} · {n(a.views)} views · {n(a.views_por_dia)}/dia
                    {a.duracao_s ? ` · ${a.duracao_s}s` : ""}
                    {a.transcricao ? " · 📝 transcrição" : ""}
                  </span>
                </span>
                {/*
                  O caminho direto: pegar ESTE vídeo como molde, em vez de
                  abstrair uma fórmula de vários. Abre o painel abaixo com a
                  transcrição à vista.
                */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setAberto((v) => (v === a.id ? null : a.id));
                  }}
                  title="Ver a transcrição e criar um roteiro baseado neste vídeo"
                  className={`flex-none rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                    aberto === a.id
                      ? "bg-brand text-white"
                      : "border border-white/15 text-paper-dim hover:border-brand-2 hover:text-brand-2"
                  }`}
                >
                  📄 texto
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    excluirAchado(a.id);
                  }}
                  title="Remover"
                  className="flex-none rounded-lg p-1.5 text-paper-dim transition hover:text-danger"
                >
                  <IconTrash size={13} />
                </button>
              </label>

              {aberto === a.id && (
                <div className="rounded-lg border border-brand-2/30 bg-brand/5 p-3">
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-paper-dim">
                    Transcrição do vídeo original
                  </p>
                  {a.transcricao ? (
                    <textarea
                      readOnly
                      value={a.transcricao}
                      rows={7}
                      onFocus={(e) => e.currentTarget.select()}
                      className={`${inputClass} w-full resize-y text-xs leading-relaxed`}
                    />
                  ) : (
                    <p className="rounded-lg border border-white/10 bg-black/25 p-3 text-xs text-paper-dim">
                      Ainda não busquei a transcrição deste vídeo — ela é baixada quando você
                      clica em criar o roteiro abaixo. Se o dono do canal desligou as legendas,
                      não existe transcrição para pegar.
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="achado_id" value={a.id} form={`adp-${a.id}`} />
                    <div className="min-w-0 flex-1">
                      <label className={labelClass}>
                        Sobre o que é o SEU vídeo? (vazio = mesmo tema, sua versão)
                      </label>
                      <input
                        name="assunto"
                        form={`adp-${a.id}`}
                        placeholder="deixe vazio para seguir o mesmo tema"
                        className={`${inputClass} mt-1 w-full text-xs`}
                      />
                    </div>
                    <select
                      name="duracao"
                      form={`adp-${a.id}`}
                      defaultValue={String(Math.min(90, Math.max(30, a.duracao_s || 45)))}
                      className={`${inputClass} w-20 text-xs`}
                    >
                      {[30, 45, 60, 90].map((d) => (
                        <option key={d} value={d}>
                          {d}s
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      form={`adp-${a.id}`}
                      disabled={adaptando}
                      className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
                    >
                      {adaptando ? "Escrevendo…" : "✍️ Criar roteiro deste vídeo"}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-paper-dim">
                    Segue a mesma estrutura, ordem de argumentos e ritmo do original — reescrito
                    com palavras próprias. Copiar o texto igual daria conteúdo duplicado, que as
                    plataformas penalizam.
                  </p>
                </div>
              )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-sm text-paper-dim">{marcados.size} de até 5 marcados</span>
            <button
              type="submit"
              disabled={dissecando || marcados.size === 0}
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-50"
            >
              {dissecando ? "🧠 Dissecando (busca transcrições + IA)…" : "🧠 Dissecar a fórmula"}
            </button>
            {dissecando && (
              <span className="text-xs text-paper-dim">isso leva ~30–60s</span>
            )}
          </div>
          {dissecEstado?.error && <p className="mt-2 text-sm text-danger">{dissecEstado.error}</p>}
          {dissecEstado?.ok && <p className="mt-2 text-sm text-ok">✅ {dissecEstado.ok}</p>}
        </form>
      )}

      {/* ------------------------------ fórmulas ------------------------------ */}
      {formulas.length > 0 && (
        <div className="anim-entrada d3 flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-paper-dim">
            Fórmulas salvas ({formulas.length})
          </h2>
          {formulas.map((f) => (
            <details key={f.id} className="card-aurora group/f rounded-xl p-4">
              <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
                <Robo estado="trabalhando" tamanho={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-paper">{f.nome}</span>
                  <span className="block truncate text-xs text-paper-dim">
                    {f.formula.promessa} · {f.achados.length} vídeo{f.achados.length > 1 ? "s" : ""}
                    {f.modelo ? ` · ${f.modelo.split(":")[1]}` : ""}
                  </span>
                </span>
                <span className="flex-none text-xs font-bold text-paper-dim group-open/f:hidden">
                  abrir ▾
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    excluirFormula(f.id);
                  }}
                  title="Excluir fórmula"
                  className="flex-none rounded-lg p-1.5 text-paper-dim transition hover:text-danger"
                >
                  <IconTrash size={13} />
                </button>
              </summary>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <Campo rotulo="🪝 Gancho" valor={f.formula.gancho} />
                <Campo rotulo="🎁 Promessa" valor={f.formula.promessa} />
                <Campo rotulo="🏷️ Padrão de título" valor={f.formula.padrao_titulo} />
                <Campo rotulo="🥁 Ritmo" valor={f.formula.ritmo} />
                <Campo
                  rotulo="📣 CTA"
                  valor={`${f.formula.cta.momento} — ${f.formula.cta.como}`}
                />
                <Campo rotulo="💡 Observações" valor={f.formula.observacoes} />
              </div>
              <div className="mt-2 rounded-lg border border-white/10 bg-black/25 p-3">
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-paper-dim">
                  Estrutura
                </p>
                <ol className="flex flex-col gap-1">
                  {f.formula.estrutura.map((b, i) => (
                    <li key={i} className="flex gap-2 text-xs">
                      <span className="w-14 flex-none font-bold tabular-nums text-brand-2">
                        {b.segundos}
                      </span>
                      <span className="text-paper">
                        <b>{b.bloco}</b>
                        <span className="text-paper-dim"> — {b.funcao}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              {/* Cria um vídeo NOVO com esta mecânica — sobre o que você quiser. */}
              <div className="mt-3 rounded-lg border border-brand-2/30 bg-brand/10 p-3">
                <p className="mb-2 text-xs font-bold text-paper">
                  ✍️ Escrever um roteiro com esta fórmula
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="formula_id" value={f.id} form={`rot-${f.id}`} />
                  <input
                    name="assunto"
                    form={`rot-${f.id}`}
                    placeholder="Sobre o que é o SEU vídeo? ex.: por que todo dentista precisa de site"
                    className={`${inputClass} min-w-0 flex-1 text-xs`}
                  />
                  <select
                    name="duracao"
                    form={`rot-${f.id}`}
                    defaultValue="45"
                    className={`${inputClass} w-24 text-xs`}
                  >
                    <option value="30">30s</option>
                    <option value="45">45s</option>
                    <option value="60">60s</option>
                    <option value="90">90s</option>
                  </select>
                  <label className="flex items-center gap-1.5 text-xs text-paper-dim">
                    <input
                      type="checkbox"
                      name="formato_16x9"
                      value="1"
                      form={`rot-${f.id}`}
                      className="h-3.5 w-3.5 accent-[var(--color-brand)]"
                    />
                    + 16:9
                  </label>
                  <button
                    type="submit"
                    form={`rot-${f.id}`}
                    disabled={escrevendo}
                    className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
                  >
                    {escrevendo ? "Escrevendo…" : "Criar roteiro"}
                  </button>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}

      {/* Um form por vídeo e um por fórmula, fora dos cards — HTML não aninha formulários. */}
      {achados.map((a) => (
        <form key={`adp-${a.id}`} id={`adp-${a.id}`} action={rodarAdaptar} className="hidden" />
      ))}
      {adaptEstado?.error && (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
          {adaptEstado.error}
        </p>
      )}
      {adaptEstado?.ok && (
        <p className="rounded-lg border border-ok/40 bg-ok/10 px-4 py-2 text-sm text-ok">
          ✅ {adaptEstado.ok}
        </p>
      )}

      {formulas.map((f) => (
        <form key={`rot-${f.id}`} id={`rot-${f.id}`} action={rodarRoteiro} className="hidden" />
      ))}
      {roteiroEstado?.error && (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
          {roteiroEstado.error}
        </p>
      )}
      {roteiroEstado?.ok && (
        <p className="rounded-lg border border-ok/40 bg-ok/10 px-4 py-2 text-sm text-ok">
          ✅ {roteiroEstado.ok}
        </p>
      )}

      {/* ------------------------------ projetos ----------------------------- */}
      {projetos.length > 0 && (
        <div className="anim-entrada d3 flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-paper-dim">
            Vídeos ({projetos.length})
          </h2>
          {aprovEstado?.error && <p className="text-sm text-danger">{aprovEstado.error}</p>}
          {aprovEstado?.ok && <p className="text-sm text-ok">✅ {aprovEstado.ok}</p>}

          {projetos.map((p) => (
            <div key={p.id} className={`${cardClass} flex flex-col gap-3`}>
              <div className="flex flex-wrap items-center gap-3">
                <Robo
                  estado={
                    p.status === "gerando" ? "trabalhando" : p.status === "pronto" ? "trabalhando" : "dormindo"
                  }
                  tamanho={36}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-paper">{p.titulo}</span>
                  <span className="block text-xs text-paper-dim">
                    {p.duracao_alvo_s}s · 9:16{p.formato_16x9 ? " + 16:9" : ""}
                    {p.tema ? ` · ${p.tema}` : ""}
                  </span>
                </span>
                <span className={`flex-none rounded-md px-2.5 py-1 text-xs font-bold ${ROTULO_STATUS[p.status].classe}`}>
                  {ROTULO_STATUS[p.status].rotulo}
                </span>
                <button
                  type="button"
                  onClick={() => excluirProjeto(p.id)}
                  title="Excluir projeto"
                  className="flex-none rounded-lg p-1.5 text-paper-dim transition hover:text-danger"
                >
                  <IconTrash size={13} />
                </button>
              </div>

              {/* ROTEIRO_PRONTO / ERRO: a porta de aprovação — dá para editar antes. */}
              {(p.status === "roteiro_pronto" || p.status === "erro") && (
                <form action={rodarAprovar} className="flex flex-col gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  {p.erro && (
                    <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                      Falhou: {p.erro}
                    </p>
                  )}
                  <div>
                    <label className={labelClass}>Roteiro (é isto que vira narração — revise)</label>
                    <textarea
                      name="roteiro"
                      defaultValue={p.roteiro ?? ""}
                      rows={6}
                      className={`${inputClass} mt-1 w-full resize-y text-xs leading-relaxed`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Termos de busca dos clipes (inglês, por vírgula)</label>
                    <input
                      name="termos"
                      defaultValue={(p.termos ?? []).join(", ")}
                      className={`${inputClass} mt-1 w-full font-mono text-xs`}
                    />
                  </div>
                  {/*
                    Música: o MoneyPrinterTurbo sorteia de uma pastinha própria,
                    e a seleção padrão dele é pequena e melancólica. Aqui você
                    escolhe por vídeo — e o volume nasce em 15%, não nos 20%
                    dele, que abafam a narração.
                  */}
                  <div className="flex flex-wrap items-end gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <div>
                      <label className={labelClass}>🎵 Música de fundo</label>
                      <select
                        name="musica_modo"
                        defaultValue={
                          p.musica === "nenhuma"
                            ? "nenhuma"
                            : p.musica === "aleatoria"
                              ? "aleatoria"
                              : "arquivo"
                        }
                        className={`${inputClass} mt-1 w-48 text-xs`}
                      >
                        <option value="nenhuma">Sem música (só a voz)</option>
                        <option value="aleatoria">Sorteio do MoneyPrinter</option>
                        <option value="arquivo">Arquivo meu →</option>
                      </select>
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className={labelClass}>Caminho do MP3 (se escolheu “arquivo meu”)</label>
                      <input
                        name="musica_arquivo"
                        defaultValue={
                          p.musica === "nenhuma" || p.musica === "aleatoria" ? "" : p.musica
                        }
                        placeholder="C:\\MPT\\MoneyPrinterTurbo\\resource\\songs\\minha.mp3"
                        className={`${inputClass} mt-1 w-full font-mono text-xs`}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Volume</label>
                      <select
                        name="musica_volume"
                        defaultValue={String(p.musica_volume ?? 15)}
                        className={`${inputClass} mt-1 w-24 text-xs`}
                      >
                        {[5, 10, 15, 20, 30, 40].map((v) => (
                          <option key={v} value={v}>
                            {v}%
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={aprovando}
                    className="self-start rounded-lg bg-ok/20 px-5 py-2.5 text-sm font-bold text-ok transition hover:bg-ok/30 disabled:opacity-60"
                  >
                    {aprovando ? "Enviando…" : "✓ Aprovar e gerar vídeo"}
                  </button>
                </form>
              )}

              {(p.status === "na_fila" || p.status === "gerando") && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-paper-dim">
                  <span className="pp-pontinhos text-brand-2">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span>
                    {p.progresso ?? "aguardando"}
                    {p.agente ? ` · ${p.agente}` : ""}
                  </span>
                  {p.status === "na_fila" && (
                    <button
                      type="button"
                      onClick={() => voltarParaEdicao(p.id)}
                      className="ml-auto underline transition hover:text-paper"
                    >
                      voltar para edição
                    </button>
                  )}
                </div>
              )}

              {p.status === "pronto" && (
                <div className="rounded-lg border border-ok/30 bg-ok/10 px-3 py-2.5 text-xs">
                  <p className="font-bold text-ok">🎉 Vídeo pronto na máquina que renderizou</p>
                  <p className="mt-1 break-all font-mono text-[11px] text-paper-dim">{p.arquivo}</p>
                  {p.arquivo_16x9 && (
                    <p className="break-all font-mono text-[11px] text-paper-dim">{p.arquivo_16x9}</p>
                  )}
                  <p className="mt-1.5 text-paper-dim">
                    Abra a interface do MoneyPrinterTurbo para assistir e baixar.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------ modelos ------------------------------ */}
      <details className="anim-entrada d4 rounded-xl border border-white/10 bg-ink-2">
        <summary className="cursor-pointer list-none p-4 text-sm font-bold text-paper-dim transition hover:text-paper [&::-webkit-details-marker]:hidden">
          ⚙️ Modelos de IA (dissecação: <span className="text-paper">{modeloDissecacao}</span> ·
          roteiro: <span className="text-paper">{modeloRoteiro}</span>)
        </summary>
        <form action={salvarCfg} className="flex flex-wrap items-end gap-3 px-4 pb-4">
          <div>
            <label className={labelClass} htmlFor="modelo_dissecacao">
              Dissecação (JSON estruturado — pode ser barato)
            </label>
            <input
              id="modelo_dissecacao"
              name="modelo_dissecacao"
              defaultValue={modeloDissecacao}
              placeholder="anthropic:claude-haiku-4-5"
              className={`${inputClass} mt-1 w-72 font-mono text-xs`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="modelo_roteiro">
              Roteiro (a escrita que vai ao ar — vale o bom)
            </label>
            <input
              id="modelo_roteiro"
              name="modelo_roteiro"
              defaultValue={modeloRoteiro}
              placeholder="anthropic:claude-opus-5"
              className={`${inputClass} mt-1 w-72 font-mono text-xs`}
            />
          </div>
          <button
            type="submit"
            disabled={salvandoCfg}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
          >
            {salvandoCfg ? "Salvando…" : "Salvar"}
          </button>
          <p className="w-full text-[11px] text-paper-dim">
            Formato <code>provedor:modelo</code> — aceita qualquer modelo dos dois provedores
            (anthropic / openai), usando as chaves que a plataforma já tem.
          </p>
          {cfgEstado?.error && <p className="text-sm text-danger">{cfgEstado.error}</p>}
          {cfgEstado?.ok && <p className="text-sm text-ok">✅ {cfgEstado.ok}</p>}
        </form>
      </details>
    </div>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  if (!valor?.trim()) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-black/25 p-3">
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-paper-dim">{rotulo}</p>
      <p className="text-xs leading-relaxed text-paper">{valor}</p>
    </div>
  );
}
