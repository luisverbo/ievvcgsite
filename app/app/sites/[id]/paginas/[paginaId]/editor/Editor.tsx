"use client";

import { useState } from "react";
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
import {
  adicionarBloco,
  alternarOculto,
  duplicarBloco,
  excluirBloco,
  publicarPagina,
  reordenarBlocos,
  salvarBloco,
} from "./actions";
import { btnPrimary } from "@/components/painel/ui";

type Bloco = { id: string; tipo: string; config: Record<string, unknown>; oculto: boolean };

type Props = {
  siteAdminId: string;
  siteSlug: string;
  orgId: string;
  paginaId: string;
  paginaSlug: string;
  siteId: string;
  publicado: boolean;
  urlPublica: string;
  urlVer: string;
  blocosIniciais: Bloco[];
};

function Item({
  bloco,
  onEditar,
  onDuplicar,
  onOcultar,
  onExcluir,
}: {
  bloco: Bloco;
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
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-2 rounded-lg border border-white/10 bg-ink-2 p-2.5"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab px-1 text-paper-dim"
        aria-label="Arrastar"
        title="Arrastar para reordenar"
      >
        ⋮⋮
      </button>
      <span className="text-lg">{def?.icone ?? "▫"}</span>
      <button onClick={onEditar} className="flex-1 text-left text-sm font-semibold">
        {def?.nome ?? bloco.tipo}
        {bloco.oculto && <span className="ml-2 text-xs text-paper-dim">(oculto)</span>}
      </button>
      <button onClick={onOcultar} title={bloco.oculto ? "Mostrar" : "Ocultar"} className="px-1.5 text-paper-dim hover:text-paper">
        {bloco.oculto ? "🙈" : "👁"}
      </button>
      <button onClick={onDuplicar} title="Duplicar" className="px-1.5 text-paper-dim hover:text-paper">⧉</button>
      <button onClick={onExcluir} title="Excluir" className="px-1.5 text-danger">✕</button>
    </div>
  );
}

export default function Editor(props: Props) {
  const [blocos, setBlocos] = useState<Bloco[]>(props.blocosIniciais);
  const [editando, setEditando] = useState<Bloco | null>(null);
  const [aba, setAba] = useState<"previa" | "editar">("previa");
  const [biblioteca, setBiblioteca] = useState(false);
  const [dispositivo, setDispositivo] = useState<"mobile" | "desktop">("desktop");
  const [previewKey, setPreviewKey] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [publicado, setPublicado] = useState(props.publicado);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Recarrega o iframe da prévia (remonta pela key + busta cache com ?pv=).
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
    setBlocos(await adicionarBloco(props.paginaId, props.siteAdminId, tipo));
    recarregarPreview();
  }

  async function onExcluir(b: Bloco) {
    if (!confirm("Excluir este bloco?")) return;
    setBlocos(await excluirBloco(b.id, props.paginaId, props.siteAdminId));
    if (editando?.id === b.id) setEditando(null);
    recarregarPreview();
  }

  async function onSalvar() {
    if (!editando) return;
    setSalvando(true);
    await salvarBloco(editando.id, props.paginaId, props.siteAdminId, editando.config);
    // reflete o config salvo na lista local
    setBlocos((bs) => bs.map((b) => (b.id === editando.id ? { ...b, config: editando.config } : b)));
    setSalvando(false);
    setAba("previa");
    recarregarPreview();
  }

  async function togglePublicar() {
    const novo = !publicado;
    setPublicado(novo);
    await publicarPagina(props.paginaId, props.siteId, props.siteAdminId, novo);
    recarregarPreview();
  }

  const previewSrc = `${props.urlPublica}?pv=${previewKey}`;

  return (
    <div className="flex flex-col gap-4">
      {/* barra superior */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/app/sites/${props.siteAdminId}`} className="text-sm text-paper-dim hover:text-paper">
          ← Voltar ao site
        </Link>
        <div className="flex items-center gap-3">
          <a href={props.urlVer} target="_blank" rel="noreferrer" className="text-sm text-brand-2 hover:underline">
            Ver site ↗
          </a>
          <button onClick={togglePublicar} className={publicado ? "rounded-full border border-white/15 px-4 py-2 text-sm font-semibold" : `${btnPrimary} px-4 py-2 text-sm`}>
            {publicado ? "Despublicar" : "Publicar"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
        {/* coluna esquerda: blocos */}
        <div className="flex flex-col gap-3">
          <button onClick={() => setBiblioteca(true)} className="rounded-lg border border-dashed border-white/25 py-3 text-sm font-semibold text-paper hover:border-brand-2">
            + Adicionar bloco
          </button>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={blocos.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {blocos.map((b) => (
                  <Item
                    key={b.id}
                    bloco={b}
                    onEditar={() => {
                      setEditando(b);
                      setAba("editar");
                    }}
                    onDuplicar={async () => {
                      await duplicarBloco(b.id, props.paginaId, props.siteAdminId);
                      recarregarPreview();
                    }}
                    onOcultar={async () => {
                      await alternarOculto(b.id, !b.oculto, props.paginaId, props.siteAdminId);
                      recarregarPreview();
                    }}
                    onExcluir={() => onExcluir(b)}
                  />
                ))}
                {blocos.length === 0 && (
                  <p className="rounded-lg border border-white/10 p-4 text-center text-sm text-paper-dim">
                    Nenhum bloco ainda. Clique em “Adicionar bloco”.
                  </p>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* coluna direita: prévia / edição */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setAba("previa")} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${aba === "previa" ? "bg-brand text-white" : "text-paper-dim"}`}>
              Prévia
            </button>
            {editando && (
              <button onClick={() => setAba("editar")} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${aba === "editar" ? "bg-brand text-white" : "text-paper-dim"}`}>
                Editando: {BLOCOS_POR_TIPO.get(editando.tipo)?.nome}
              </button>
            )}
            {aba === "previa" && (
              <div className="ml-auto flex gap-1">
                <button onClick={() => setDispositivo("mobile")} className={`rounded px-2 py-1 text-sm ${dispositivo === "mobile" ? "bg-ink-3" : ""}`} title="Celular">📱</button>
                <button onClick={() => setDispositivo("desktop")} className={`rounded px-2 py-1 text-sm ${dispositivo === "desktop" ? "bg-ink-3" : ""}`} title="Computador">🖥️</button>
              </div>
            )}
          </div>

          {aba === "previa" ? (
            <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5" style={{ height: "70vh" }}>
              <iframe
                key={previewKey}
                src={previewSrc}
                title="Prévia"
                className="mx-auto block h-full border-0 bg-white transition-all"
                style={{ width: dispositivo === "mobile" ? 390 : "100%" }}
              />
            </div>
          ) : editando ? (
            <div className="rounded-xl border border-white/10 bg-ink-2 p-5">
              <BlockForm
                tipo={editando.tipo}
                orgId={props.orgId}
                value={editando.config}
                onChange={(config) => setEditando({ ...editando, config })}
              />
              <div className="mt-5 flex gap-3">
                <button onClick={onSalvar} disabled={salvando} className={`${btnPrimary} px-6 py-2.5`}>
                  {salvando ? "Salvando…" : "Salvar bloco"}
                </button>
                <button onClick={() => setAba("previa")} className="rounded-full border border-white/15 px-6 py-2.5 font-bold text-paper">
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* biblioteca de blocos */}
      {biblioteca && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setBiblioteca(false)}>
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-ink-2 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Adicionar bloco</h2>
              <button onClick={() => setBiblioteca(false)} className="text-paper-dim">✕</button>
            </div>
            {CATEGORIAS.map((cat) => {
              const doCat = BLOCOS.filter((b) => b.categoria === cat);
              if (doCat.length === 0) return null;
              return (
                <div key={cat} className="mb-5">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-paper-dim">{cat}</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {doCat.map((b) => (
                      <button
                        key={b.tipo}
                        onClick={() => addBloco(b.tipo)}
                        className="flex items-start gap-3 rounded-lg border border-white/10 p-3 text-left hover:border-brand-2"
                      >
                        <span className="text-xl">{b.icone}</span>
                        <span>
                          <span className="block text-sm font-semibold">{b.nome}</span>
                          <span className="block text-xs text-paper-dim">{b.descricao}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
