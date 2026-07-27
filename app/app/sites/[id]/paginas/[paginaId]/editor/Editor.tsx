"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { BLOCOS, BLOCOS_POR_TIPO, CATEGORIAS } from "@/lib/blocks/registry";
import BlockForm from "@/components/blocks/forms";
import CoresPagina from "./CoresPagina";
import { buildThemeCss, mesclarTema, temPersonalizacao } from "@/lib/theme";
import type { Tema } from "@/lib/types";
import {
  IconBack,
  IconCheck,
  IconCopy,
  IconExternal,
  IconEye,
  IconEyeOff,
  IconGrip,
  IconMonitor,
  IconPhone,
  IconPlus,
  IconRocket,
  IconSearch,
  IconTrash,
  IconX,
} from "@/components/painel/icons";
import {
  adicionarBloco,
  alternarOculto,
  duplicarBloco,
  excluirBloco,
  publicarPagina,
  reordenarBlocos,
  salvarBloco,
} from "./actions";

type Bloco = { id: string; tipo: string; config: Record<string, unknown>; oculto: boolean };

type Props = {
  siteAdminId: string;
  siteNome: string;
  siteSlug: string;
  orgId: string;
  paginaId: string;
  paginaSlug: string;
  paginaTitulo: string;
  siteId: string;
  publicado: boolean;
  urlPublica: string;
  urlVer: string;
  blocosIniciais: Bloco[];
  temaSite: Tema;
  temaPagina: Tema | null;
};

const acaoBtn =
  "flex h-7 w-7 items-center justify-center rounded-md text-paper-dim transition hover:bg-white/10 hover:text-paper";

function ItemBloco({
  bloco,
  ativo,
  onEditar,
  onDuplicar,
  onOcultar,
  onExcluir,
}: {
  bloco: Bloco;
  ativo: boolean;
  onEditar: () => void;
  onDuplicar: () => void;
  onOcultar: () => void;
  onExcluir: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bloco.id,
  });
  const def = BLOCOS_POR_TIPO.get(bloco.tipo);
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={`group flex items-center gap-1.5 rounded-xl border p-2 transition ${
        ativo
          ? "border-brand-2/60 bg-brand/10"
          : "border-white/8 bg-ink-2 hover:border-white/20"
      } ${bloco.oculto ? "opacity-55" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none rounded p-1 text-paper-dim/60 hover:text-paper"
        aria-label="Arrastar para reordenar"
      >
        <IconGrip size={15} />
      </button>
      <button onClick={onEditar} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-white/6 text-base">
          {def?.icone ?? "▫"}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold leading-tight">
            {def?.nome ?? bloco.tipo}
          </span>
          <span className="block text-[11px] text-paper-dim">
            {bloco.oculto ? "Oculto no site" : def?.categoria}
          </span>
        </span>
      </button>
      <div className="flex items-center opacity-0 transition group-hover:opacity-100">
        <button onClick={onOcultar} title={bloco.oculto ? "Mostrar" : "Ocultar"} className={acaoBtn}>
          {bloco.oculto ? <IconEyeOff size={15} /> : <IconEye size={15} />}
        </button>
        <button onClick={onDuplicar} title="Duplicar" className={acaoBtn}>
          <IconCopy size={15} />
        </button>
        <button
          onClick={onExcluir}
          title="Excluir"
          className="flex h-7 w-7 items-center justify-center rounded-md text-paper-dim transition hover:bg-danger/15 hover:text-danger"
        >
          <IconTrash size={15} />
        </button>
      </div>
    </div>
  );
}

export default function Editor(props: Props) {
  const [blocos, setBlocos] = useState<Bloco[]>(props.blocosIniciais);
  const [editando, setEditando] = useState<Bloco | null>(null);
  const [biblioteca, setBiblioteca] = useState(false);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string>("Todos");
  const [dispositivo, setDispositivo] = useState<"mobile" | "desktop">("desktop");
  const [previewKey, setPreviewKey] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [publicado, setPublicado] = useState(props.publicado);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [coresAberto, setCoresAberto] = useState(false);
  // temaPagina = o que a prévia mostra agora; temaSalvo = o que está no banco.
  const [temaPagina, setTemaPagina] = useState<Tema | null>(props.temaPagina);
  const [temaSalvo, setTemaSalvo] = useState<Tema | null>(props.temaPagina);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Prévia ao vivo: manda o rascunho para o iframe a cada tecla (com respiro),
  // então o texto aparece na hora — sem precisar salvar.
  const blocosRascunho = useMemo(
    () =>
      blocos
        .filter((b) => !b.oculto)
        .map((b) => (editando && b.id === editando.id ? { ...b, config: editando.config } : b))
        .map((b) => ({ id: b.id, tipo: b.tipo, config: b.config })),
    [blocos, editando],
  );

  // CSS do tema da página (null = herda do site, sem sobrescrever nada).
  const temaCss = useMemo(
    () =>
      temPersonalizacao(temaPagina)
        ? buildThemeCss(mesclarTema(props.temaSite, temaPagina))
        : null,
    [temaPagina, props.temaSite],
  );

  function enviarRascunho() {
    iframeRef.current?.contentWindow?.postMessage(
      { tipo: "pp-preview", blocos: blocosRascunho, temaCss },
      window.location.origin,
    );
  }

  useEffect(() => {
    const t = setTimeout(enviarRascunho, 160);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocosRascunho, temaCss]);

  // Quando a prévia (re)carrega, ela avisa e recebe o rascunho atual.
  useEffect(() => {
    function onMensagem(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if ((e.data as { tipo?: string })?.tipo === "pp-preview-pronto") enviarRascunho();
    }
    window.addEventListener("message", onMensagem);
    return () => window.removeEventListener("message", onMensagem);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocosRascunho]);

  function avisar(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  function recarregarPreview() {
    setPreviewKey((k) => k + 1);
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = blocos.findIndex((b) => b.id === active.id);
    const newIdx = blocos.findIndex((b) => b.id === over.id);
    const novo = arrayMove(blocos, oldIdx, newIdx);
    setBlocos(novo);
    await reordenarBlocos(props.paginaId, props.siteAdminId, novo.map((b) => b.id));
    recarregarPreview();
  }

  async function addBloco(tipo: string) {
    setBiblioteca(false);
    const lista = await adicionarBloco(props.paginaId, props.siteAdminId, tipo);
    setBlocos(lista);
    recarregarPreview();
    // abre direto a edição do bloco recém-criado
    const novo = lista[lista.length - 1];
    if (novo && novo.tipo === tipo) setEditando(novo);
  }

  async function onExcluir(b: Bloco) {
    if (!confirm("Excluir este bloco?")) return;
    setBlocos(await excluirBloco(b.id, props.paginaId, props.siteAdminId));
    if (editando?.id === b.id) setEditando(null);
    recarregarPreview();
  }

  async function onDuplicar(b: Bloco) {
    setBlocos(await duplicarBloco(b.id, props.paginaId, props.siteAdminId));
    recarregarPreview();
  }

  async function onOcultar(b: Bloco) {
    setBlocos(await alternarOculto(b.id, !b.oculto, props.paginaId, props.siteAdminId));
    recarregarPreview();
  }

  async function onSalvar() {
    if (!editando) return;
    setSalvando(true);
    await salvarBloco(editando.id, props.paginaId, props.siteAdminId, editando.config);
    setBlocos((bs) => bs.map((b) => (b.id === editando.id ? { ...b, config: editando.config } : b)));
    setSalvando(false);
    recarregarPreview();
    avisar("Alterações salvas");
  }

  async function togglePublicar() {
    const novo = !publicado;
    setPublicando(true);
    setPublicado(novo);
    await publicarPagina(props.paginaId, props.siteId, props.siteAdminId, novo);
    setPublicando(false);
    recarregarPreview();
    avisar(novo ? "Página publicada 🎉" : "Página despublicada");
  }

  // Prévia dedicada (sempre dinâmica e conectada ao editor por postMessage).
  const previewSrc = `/pp-preview/${props.paginaId}?pv=${previewKey}`;
  const defEditando = editando ? BLOCOS_POR_TIPO.get(editando.tipo) : null;

  const categorias = useMemo(() => ["Todos", ...CATEGORIAS], []);
  const blocosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return BLOCOS.filter((b) => {
      if (categoria !== "Todos" && b.categoria !== categoria) return false;
      if (!q) return true;
      return (
        b.nome.toLowerCase().includes(q) ||
        b.descricao.toLowerCase().includes(q) ||
        b.categoria.toLowerCase().includes(q)
      );
    });
  }, [busca, categoria]);

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col">
      {/* ------- barra superior ------- */}
      <div className="flex h-14 flex-none items-center gap-3 border-b border-white/10 bg-ink-2/70 px-4 backdrop-blur">
        <Link
          href={`/app/sites/${props.siteAdminId}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-paper-dim transition hover:bg-white/10 hover:text-paper"
          title="Voltar ao site"
        >
          <IconBack size={17} />
        </Link>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold leading-tight">{props.paginaTitulo}</div>
          <div className="truncate text-[11px] text-paper-dim">
            {props.siteNome} · /{props.paginaSlug || ""}
          </div>
        </div>
        <span
          className={`hidden rounded-full px-2.5 py-0.5 text-[11px] font-bold sm:inline ${
            publicado ? "bg-ok/15 text-ok" : "bg-white/10 text-paper-dim"
          }`}
        >
          {publicado ? "No ar" : "Rascunho"}
        </span>

        {/* alternador de dispositivo */}
        <div className="mx-auto hidden items-center gap-1 rounded-lg border border-white/10 bg-ink p-1 md:flex">
          <button
            onClick={() => setDispositivo("desktop")}
            className={`flex h-7 w-9 items-center justify-center rounded-md transition ${
              dispositivo === "desktop" ? "bg-white/12 text-paper" : "text-paper-dim hover:text-paper"
            }`}
            title="Visualizar em computador"
          >
            <IconMonitor size={16} />
          </button>
          <button
            onClick={() => setDispositivo("mobile")}
            className={`flex h-7 w-9 items-center justify-center rounded-md transition ${
              dispositivo === "mobile" ? "bg-white/12 text-paper" : "text-paper-dim hover:text-paper"
            }`}
            title="Visualizar em celular"
          >
            <IconPhone size={16} />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <button
            onClick={() => setCoresAberto(true)}
            title="Cores desta página"
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition hover:bg-white/10 ${
              temPersonalizacao(temaPagina) ? "text-brand-2" : "text-paper-dim hover:text-paper"
            }`}
          >
            🎨 <span className="hidden sm:inline">Cores</span>
          </button>
          <a
            href={props.urlVer}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-paper-dim transition hover:bg-white/10 hover:text-paper sm:flex"
          >
            <IconExternal size={14} /> Ver site
          </a>
          <button
            onClick={togglePublicar}
            disabled={publicando}
            className={
              publicado
                ? "rounded-lg border border-white/15 px-4 py-1.5 text-sm font-bold text-paper transition hover:border-white/30 disabled:opacity-60"
                : "flex items-center gap-1.5 rounded-lg bg-brand px-4 py-1.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
            }
          >
            {publicado ? "Despublicar" : (
              <>
                <IconRocket size={14} /> Publicar
              </>
            )}
          </button>
        </div>
      </div>

      {/* ------- área de trabalho ------- */}
      <div className="flex min-h-0 flex-1">
        {/* coluna esquerda: lista de blocos OU inspetor de edição */}
        <aside className="flex w-[300px] flex-none flex-col border-r border-white/10 bg-ink-2/40 lg:w-[340px]">
          {editando ? (
            <>
              <div className="flex h-12 flex-none items-center gap-2 border-b border-white/10 px-3">
                <button
                  onClick={() => setEditando(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-paper-dim transition hover:bg-white/10 hover:text-paper"
                  title="Voltar aos blocos"
                >
                  <IconBack size={15} />
                </button>
                <span className="text-base">{defEditando?.icone}</span>
                <span className="truncate text-sm font-bold">{defEditando?.nome}</span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <BlockForm
                  tipo={editando.tipo}
                  orgId={props.orgId}
                  value={editando.config}
                  onChange={(config) => setEditando({ ...editando, config })}
                />

                {/* comportamento universal — vale para qualquer bloco */}
                {(() => {
                  const apos = Number(
                    (editando.config as { _aparecer_apos?: number })._aparecer_apos ?? 0,
                  );
                  const setApos = (seg: number) =>
                    setEditando({
                      ...editando,
                      config: { ...editando.config, _aparecer_apos: Math.max(0, Math.round(seg)) },
                    });
                  const atrasado = apos > 0;
                  return (
                    <div className="mt-5 border-t border-white/10 pt-4">
                      <label className="text-sm font-medium text-paper-dim">Aparecer no site</label>
                      <div className="mt-1.5 flex gap-2">
                        <select
                          className="rounded-lg border border-white/10 bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none focus-visible:border-brand-2"
                          value={atrasado ? "atraso" : "imediato"}
                          onChange={(e) => setApos(e.target.value === "atraso" ? apos || 20 : 0)}
                        >
                          <option value="imediato">Imediatamente</option>
                          <option value="atraso">Depois de…</option>
                        </select>
                        {atrasado && (
                          <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-ink-2 px-3 focus-within:border-brand-2">
                            <input
                              type="number"
                              min={1}
                              max={3600}
                              value={apos}
                              onChange={(e) => setApos(Number(e.target.value) || 0)}
                              className="w-full bg-transparent py-2.5 text-sm text-paper outline-none"
                            />
                            <span className="flex-none text-sm text-paper-dim">segundos</span>
                          </div>
                        )}
                      </div>
                      {atrasado && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {[10, 20, 30, 60, 120].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setApos(s)}
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                                apos === s
                                  ? "bg-brand text-white"
                                  : "bg-white/8 text-paper-dim hover:text-paper"
                              }`}
                            >
                              {s < 60 ? `${s}s` : `${s / 60}min`}
                            </button>
                          ))}
                        </div>
                      )}
                      <p className="mt-2 text-xs text-paper-dim">
                        {atrasado
                          ? `O bloco surge com animação depois de ${apos} segundo${apos === 1 ? "" : "s"} na página. Ótimo para revelar uma oferta quando o visitante já está engajado.`
                          : "O bloco aparece assim que a página abre."}
                      </p>
                    </div>
                  );
                })()}

                {/* espaçamento vertical do bloco */}
                {(() => {
                  const cfg = editando.config as { _pad_topo?: number; _pad_baixo?: number };
                  const setPad = (campo: "_pad_topo" | "_pad_baixo", v: number | undefined) =>
                    setEditando({ ...editando, config: { ...editando.config, [campo]: v } });
                  const OPCOES = [
                    { v: 0, r: "Colado" },
                    { v: 16, r: "Mínimo" },
                    { v: 40, r: "Pequeno" },
                    { v: 76, r: "Padrão" },
                    { v: 120, r: "Grande" },
                  ];
                  const seletor = (campo: "_pad_topo" | "_pad_baixo", label: string) => {
                    const atual = cfg[campo];
                    return (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-paper-dim">{label}</span>
                        <select
                          className="rounded-lg border border-white/10 bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus-visible:border-brand-2"
                          value={atual === undefined ? "auto" : String(atual)}
                          onChange={(e) =>
                            setPad(campo, e.target.value === "auto" ? undefined : Number(e.target.value))
                          }
                        >
                          <option value="auto">Padrão</option>
                          {OPCOES.map((o) => (
                            <option key={o.v} value={o.v}>
                              {o.r} ({o.v}px)
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  };
                  return (
                    <div className="mt-5 border-t border-white/10 pt-4">
                      <label className="text-sm font-medium text-paper-dim">
                        Espaçamento do bloco
                      </label>
                      <div className="mt-1.5 grid grid-cols-2 gap-2">
                        {seletor("_pad_topo", "Espaço acima")}
                        {seletor("_pad_baixo", "Espaço abaixo")}
                      </div>
                      <p className="mt-2 text-xs text-paper-dim">
                        Reduza o “espaço acima” para colar este bloco no de cima — ex: o botão logo
                        embaixo do vídeo.
                      </p>
                    </div>
                  );
                })()}
              </div>
              <div className="flex flex-none gap-2 border-t border-white/10 p-3">
                <button
                  onClick={onSalvar}
                  disabled={salvando}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
                >
                  {salvando ? "Salvando…" : (
                    <>
                      <IconCheck size={15} /> Salvar
                    </>
                  )}
                </button>
                <button
                  onClick={() => setEditando(null)}
                  className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-bold text-paper transition hover:border-white/30"
                >
                  Fechar
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex-none p-3">
                <button
                  onClick={() => setBiblioteca(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/25 py-3 text-sm font-bold text-paper transition hover:border-brand-2 hover:bg-brand/5 hover:text-brand-2"
                >
                  <IconPlus size={16} /> Adicionar bloco
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={blocos.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-1.5">
                      {blocos.map((b) => (
                        <ItemBloco
                          key={b.id}
                          bloco={b}
                          ativo={false}
                          onEditar={() => setEditando(b)}
                          onDuplicar={() => onDuplicar(b)}
                          onOcultar={() => onOcultar(b)}
                          onExcluir={() => onExcluir(b)}
                        />
                      ))}
                      {blocos.length === 0 && (
                        <p className="rounded-xl border border-white/10 p-5 text-center text-sm text-paper-dim">
                          Sua página está vazia.
                          <br />
                          Comece adicionando um bloco. ✨
                        </p>
                      )}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </>
          )}
        </aside>

        {/* coluna direita: prévia sempre visível */}
        <div
          className="flex min-w-0 flex-1 items-stretch justify-center overflow-auto p-4 lg:p-6"
          style={{
            backgroundImage: "radial-gradient(rgba(244,246,251,0.07) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        >
          <div
            className="flex w-full flex-col overflow-hidden rounded-xl border border-white/12 bg-ink-2 shadow-2xl transition-all duration-300"
            style={{ maxWidth: dispositivo === "mobile" ? 400 : 1400 }}
          >
            {/* “chrome” do navegador */}
            <div className="flex flex-none items-center gap-2 border-b border-white/10 bg-ink px-3 py-2">
              <span className="flex gap-1.5">
                <i className="h-2.5 w-2.5 rounded-full bg-danger/70" />
                <i className="h-2.5 w-2.5 rounded-full bg-warn/70" />
                <i className="h-2.5 w-2.5 rounded-full bg-ok/70" />
              </span>
              <span className="mx-auto flex max-w-[70%] items-center gap-1.5 truncate rounded-md bg-white/6 px-3 py-1 text-[11px] text-paper-dim">
                🔒 {props.siteSlug}
                {props.paginaSlug ? `/${props.paginaSlug}` : ""}
              </span>
            </div>
            <iframe
              key={previewKey}
              ref={iframeRef}
              src={previewSrc}
              title="Prévia da página"
              className="min-h-0 w-full flex-1 border-0 bg-white"
              onLoad={enviarRascunho}
            />
          </div>
        </div>
      </div>

      {/* ------- toast ------- */}
      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-ink-3 px-5 py-2.5 text-sm font-semibold shadow-2xl">
            <span className="text-ok">
              <IconCheck size={15} />
            </span>
            {toast}
          </div>
        </div>
      )}

      {/* ------- cores da página ------- */}
      {coresAberto && (
        <CoresPagina
          paginaId={props.paginaId}
          siteAdminId={props.siteAdminId}
          temaSite={props.temaSite}
          temaInicial={temaPagina}
          onMudar={setTemaPagina}
          onFechar={() => {
            setCoresAberto(false);
            setTemaPagina(temaSalvo); // cancelou: prévia volta ao salvo
          }}
          onSalvo={(t) => {
            setTemaSalvo(t);
            setTemaPagina(t);
            setCoresAberto(false);
            avisar("Cores da página salvas");
          }}
        />
      )}

      {/* ------- biblioteca de blocos ------- */}
      {biblioteca && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setBiblioteca(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-none items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <h2 className="text-lg font-extrabold">Biblioteca de blocos</h2>
                <p className="text-xs text-paper-dim">Clique num bloco para adicioná-lo à página.</p>
              </div>
              <button
                onClick={() => setBiblioteca(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-paper-dim transition hover:bg-white/10 hover:text-paper"
              >
                <IconX size={16} />
              </button>
            </div>

            <div className="flex flex-none flex-col gap-3 border-b border-white/10 px-6 py-3">
              <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-ink px-3 py-2 focus-within:border-brand-2">
                <span className="text-paper-dim">
                  <IconSearch size={15} />
                </span>
                <input
                  autoFocus
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar bloco… (ex: preço, vídeo, depoimento)"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-paper-dim/60"
                />
              </label>
              <div className="flex flex-wrap gap-1.5">
                {categorias.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoria(cat)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      categoria === cat
                        ? "bg-brand text-white"
                        : "bg-white/6 text-paper-dim hover:bg-white/12 hover:text-paper"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="grid gap-2 sm:grid-cols-2">
                {blocosFiltrados.map((b) => (
                  <button
                    key={b.tipo}
                    onClick={() => addBloco(b.tipo)}
                    className="group flex items-start gap-3 rounded-xl border border-white/10 p-3.5 text-left transition hover:border-brand-2 hover:bg-brand/5"
                  >
                    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-white/6 text-xl transition group-hover:bg-brand/15">
                      {b.icone}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">{b.nome}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-paper-dim">
                        {b.descricao}
                      </span>
                    </span>
                  </button>
                ))}
                {blocosFiltrados.length === 0 && (
                  <p className="col-span-full py-8 text-center text-sm text-paper-dim">
                    Nenhum bloco encontrado para “{busca}”.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
