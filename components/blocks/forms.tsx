"use client";

import UploadInput from "@/components/painel/UploadInput";
import { inputClass, labelClass } from "@/components/painel/ui";
import type {
  BotaoConfig,
  CabecalhoConfig,
  HeroConfig,
  TextoConfig,
  ImagemConfig,
  VideoConfig,
  CtaConfig,
  CardsConfig,
  ListaConfig,
  GaleriaConfig,
  DepoimentosConfig,
  FaqConfig,
  OfertaConfig,
  FormularioConfig,
  CampoFormulario,
  LogosConfig,
  LogoItem,
  RodapeConfig,
  VideoOpcoesConfig,
  AvisoConfig,
  EstatisticasConfig,
  PassosConfig,
  PlanosConfig,
  PlanoItem,
  GarantiaConfig,
  MidiaTextoConfig,
  HtmlConfig,
} from "@/lib/blocks/types";

type Cfg = Record<string, unknown>;
type FormProps = { value: Cfg; onChange: (v: Cfg) => void; orgId: string };

/* ---------- campos reutilizáveis ---------- */
function Campo({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelClass}>{label}</label>
      <input
        className={inputClass}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Area({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelClass}>{label}</label>
      <textarea
        className={inputClass}
        rows={3}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ArrayEditor<T>({
  label,
  itens,
  onChange,
  novo,
  render,
}: {
  label: string;
  itens: T[];
  onChange: (v: T[]) => void;
  novo: () => T;
  render: (item: T, patch: (p: Partial<T>) => void, i: number) => React.ReactNode;
}) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= itens.length) return;
    const copy = [...itens];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  };
  return (
    <div className="flex flex-col gap-2">
      <label className={labelClass}>{label}</label>
      {itens.map((item, i) => (
        <div key={i} className="rounded-lg border border-white/10 bg-ink-3 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-paper-dim">#{i + 1}</span>
            <div className="flex gap-1">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded border border-white/15 px-2 text-xs disabled:opacity-30">▲</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === itens.length - 1} className="rounded border border-white/15 px-2 text-xs disabled:opacity-30">▼</button>
              <button type="button" onClick={() => onChange(itens.filter((_, idx) => idx !== i))} className="rounded border border-white/15 px-2 text-xs text-danger">✕</button>
            </div>
          </div>
          {render(item, (p) => onChange(itens.map((it, idx) => (idx === i ? { ...it, ...p } : it))), i)}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...itens, novo()])}
        className="rounded-lg border border-dashed border-white/20 py-2 text-sm text-paper-dim hover:border-brand-2"
      >
        + Adicionar
      </button>
    </div>
  );
}

function BotaoEditor({ value, onChange }: { value: BotaoConfig; onChange: (v: BotaoConfig) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Campo label="Texto do botão" value={value?.texto} onChange={(t) => onChange({ ...value, texto: t })} />
      <Campo label="Link (URL ou #secao)" value={value?.href} onChange={(h) => onChange({ ...value, href: h })} placeholder="#oferta" />
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Estilo</label>
        <select
          className={inputClass}
          value={value?.estilo ?? "primario"}
          onChange={(e) => onChange({ ...value, estilo: e.target.value as BotaoConfig["estilo"] })}
        >
          <option value="primario">Destaque</option>
          <option value="secundario">Contorno</option>
        </select>
      </div>
    </div>
  );
}

function VideoOpcoesEditor({
  value,
  onChange,
}: {
  value?: VideoOpcoesConfig;
  onChange: (v: VideoOpcoesConfig) => void;
}) {
  const v = value ?? {};
  const set = (p: Partial<VideoOpcoesConfig>) => onChange({ ...v, ...p });
  const check = (label: string, campo: keyof VideoOpcoesConfig, dica?: string) => (
    <label className="flex cursor-pointer items-start gap-2 text-sm text-paper">
      <input
        type="checkbox"
        className="mt-0.5"
        checked={Boolean(v[campo])}
        onChange={(e) => set({ [campo]: e.target.checked })}
      />
      <span>
        {label}
        {dica && <span className="block text-xs text-paper-dim">{dica}</span>}
      </span>
    </label>
  );
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-white/10 bg-ink-3 p-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-paper-dim">
        Opções do vídeo
      </span>
      {check("Tocar sozinho (autoplay)", "autoplay", "Inicia ao abrir a página.")}
      {check("Começar mudo", "mudo", "Se marcar autoplay SEM esta opção, o vídeo começa mudo e mostra um botão 'ativar som' (trava do navegador, sem volta).")}
      {check("Modo nativo / cinema", "nativo", "Esconde a marca, os controles, o título e as sugestões do YouTube — fica com cara de player próprio.")}
      {check("Mostrar controles (play/pause/barra)", "controles", "Desmarque para um vídeo estilo banner, sem botões. (O modo nativo já esconde os controles.)")}
      {check("Repetir em loop", "loop")}
    </div>
  );
}

function Alinhamento({ value, onChange }: { value?: string; onChange: (v: "centro" | "esquerda") => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelClass}>Alinhamento</label>
      <select className={inputClass} value={value ?? "centro"} onChange={(e) => onChange(e.target.value as "centro" | "esquerda")}>
        <option value="centro">Centralizado</option>
        <option value="esquerda">À esquerda</option>
      </select>
    </div>
  );
}

/* ---------- forms por bloco ---------- */
function CabecalhoForm({ value, onChange, orgId }: FormProps) {
  const c = value as CabecalhoConfig;
  const up = (p: Partial<CabecalhoConfig>) => onChange({ ...c, ...p });
  return (
    <div className="flex flex-col gap-3">
      <Campo label="Nome (se não usar logo)" value={c.nome} onChange={(v) => up({ nome: v })} />
      <UploadInput orgId={orgId} pasta="logo" label="Logo" value={c.logo_url ?? ""} onChange={(v) => up({ logo_url: v })} />
      <BotaoEditor value={c.botao ?? { texto: "", href: "#" }} onChange={(b) => up({ botao: b })} />
    </div>
  );
}

function HeroForm({ value, onChange, orgId }: FormProps) {
  const c = value as HeroConfig;
  const up = (p: Partial<HeroConfig>) => onChange({ ...c, ...p });
  return (
    <div className="flex flex-col gap-3">
      <Campo label="Selo (opcional)" value={c.selo} onChange={(v) => up({ selo: v })} />
      <Campo label="Título" value={c.titulo} onChange={(v) => up({ titulo: v })} />
      <Area label="Subtítulo" value={c.subtitulo} onChange={(v) => up({ subtitulo: v })} />
      <Alinhamento value={c.alinhamento} onChange={(v) => up({ alinhamento: v })} />
      <UploadInput orgId={orgId} pasta="hero" label="Imagem (opcional)" value={c.imagem_url ?? ""} onChange={(v) => up({ imagem_url: v })} />
      <Campo label="Vídeo — link YouTube/Vimeo/Shorts/Instagram (opcional)" value={c.video_url ?? ""} onChange={(v) => up({ video_url: v })} />
      {c.video_url && <VideoOpcoesEditor value={c.video_opcoes} onChange={(v) => up({ video_opcoes: v })} />}
      <ArrayEditor
        label="Botões"
        itens={c.botoes ?? []}
        onChange={(v) => up({ botoes: v })}
        novo={() => ({ texto: "Botão", href: "#", estilo: "primario" }) as BotaoConfig}
        render={(b, patch) => <BotaoEditor value={b} onChange={(nb) => patch(nb)} />}
      />
    </div>
  );
}

function TextoForm({ value, onChange }: FormProps) {
  const c = value as TextoConfig;
  const up = (p: Partial<TextoConfig>) => onChange({ ...c, ...p });
  return (
    <div className="flex flex-col gap-3">
      <Campo label="Rótulo (eyebrow)" value={c.eyebrow} onChange={(v) => up({ eyebrow: v })} />
      <Campo label="Título" value={c.titulo} onChange={(v) => up({ titulo: v })} />
      <Area label="Texto" value={c.corpo} onChange={(v) => up({ corpo: v })} />
      <Alinhamento value={c.alinhamento} onChange={(v) => up({ alinhamento: v })} />
    </div>
  );
}

function ImagemForm({ value, onChange, orgId }: FormProps) {
  const c = value as ImagemConfig;
  const up = (p: Partial<ImagemConfig>) => onChange({ ...c, ...p });
  return (
    <div className="flex flex-col gap-3">
      <UploadInput orgId={orgId} pasta="imagem" label="Imagem" value={c.imagem_url ?? ""} onChange={(v) => up({ imagem_url: v })} />
      <Campo label="Legenda (opcional)" value={c.legenda} onChange={(v) => up({ legenda: v })} />
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Largura</label>
        <select className={inputClass} value={c.largura ?? "media"} onChange={(e) => up({ largura: e.target.value as ImagemConfig["largura"] })}>
          <option value="media">Média (centralizada)</option>
          <option value="total">Largura total</option>
        </select>
      </div>
    </div>
  );
}

function VideoForm({ value, onChange, orgId }: FormProps) {
  const c = value as VideoConfig;
  const up = (p: Partial<VideoConfig>) => onChange({ ...c, ...p });
  return (
    <div className="flex flex-col gap-3">
      <Campo label="Título (opcional)" value={c.titulo} onChange={(v) => up({ titulo: v })} />
      <Campo label="Link do vídeo (YouTube, Vimeo, Shorts, Instagram)" value={c.video_url ?? ""} onChange={(v) => up({ video_url: v })} />
      <UploadInput orgId={orgId} pasta="video" label="Capa (opcional)" value={c.poster_url ?? ""} onChange={(v) => up({ poster_url: v })} />
      {c.video_url && <VideoOpcoesEditor value={c.video_opcoes} onChange={(v) => up({ video_opcoes: v })} />}
    </div>
  );
}

function CtaForm({ value, onChange }: FormProps) {
  const c = value as CtaConfig;
  const up = (p: Partial<CtaConfig>) => onChange({ ...c, ...p });
  return (
    <div className="flex flex-col gap-3">
      <Campo label="Título" value={c.titulo} onChange={(v) => up({ titulo: v })} />
      <Area label="Subtítulo" value={c.subtitulo} onChange={(v) => up({ subtitulo: v })} />
      <BotaoEditor value={c.botao ?? { texto: "", href: "#" }} onChange={(b) => up({ botao: b })} />
    </div>
  );
}

function CardsForm({ value, onChange }: FormProps) {
  const c = value as CardsConfig;
  const up = (p: Partial<CardsConfig>) => onChange({ ...c, ...p });
  return (
    <div className="flex flex-col gap-3">
      <Campo label="Rótulo" value={c.eyebrow} onChange={(v) => up({ eyebrow: v })} />
      <Campo label="Título" value={c.titulo} onChange={(v) => up({ titulo: v })} />
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Colunas</label>
        <select className={inputClass} value={String(c.colunas ?? 3)} onChange={(e) => up({ colunas: Number(e.target.value) as CardsConfig["colunas"] })}>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
      </div>
      <ArrayEditor
        label="Cards"
        itens={c.itens ?? []}
        onChange={(v) => up({ itens: v })}
        novo={() => ({ emoji: "✨", titulo: "Título", texto: "Descrição" })}
        render={(item, patch) => (
          <div className="grid gap-2">
            <Campo label="Emoji" value={item.emoji} onChange={(v) => patch({ emoji: v })} />
            <Campo label="Título" value={item.titulo} onChange={(v) => patch({ titulo: v })} />
            <Area label="Texto" value={item.texto} onChange={(v) => patch({ texto: v })} />
          </div>
        )}
      />
    </div>
  );
}

function ListaForm({ value, onChange }: FormProps) {
  const c = value as ListaConfig;
  const up = (p: Partial<ListaConfig>) => onChange({ ...c, ...p });
  return (
    <div className="flex flex-col gap-3">
      <Campo label="Rótulo" value={c.eyebrow} onChange={(v) => up({ eyebrow: v })} />
      <Campo label="Título" value={c.titulo} onChange={(v) => up({ titulo: v })} />
      <ArrayEditor
        label="Itens"
        itens={c.itens ?? []}
        onChange={(v) => up({ itens: v })}
        novo={() => "Novo item"}
        render={(item, _patch, i) => (
          <Campo label={`Item ${i + 1}`} value={item} onChange={(v) => up({ itens: (c.itens ?? []).map((it, idx) => (idx === i ? v : it)) })} />
        )}
      />
    </div>
  );
}

function GaleriaForm({ value, onChange, orgId }: FormProps) {
  const c = value as GaleriaConfig;
  const up = (p: Partial<GaleriaConfig>) => onChange({ ...c, ...p });
  return (
    <div className="flex flex-col gap-3">
      <Campo label="Rótulo" value={c.eyebrow} onChange={(v) => up({ eyebrow: v })} />
      <Campo label="Título" value={c.titulo} onChange={(v) => up({ titulo: v })} />
      <ArrayEditor
        label="Fotos"
        itens={c.imagens ?? []}
        onChange={(v) => up({ imagens: v })}
        novo={() => ""}
        render={(item, _patch, i) => (
          <UploadInput
            orgId={orgId}
            pasta="galeria"
            label={`Foto ${i + 1}`}
            value={item}
            onChange={(v) => up({ imagens: (c.imagens ?? []).map((it, idx) => (idx === i ? v : it)) })}
          />
        )}
      />
    </div>
  );
}

function DepoimentosForm({ value, onChange, orgId }: FormProps) {
  const c = value as DepoimentosConfig;
  const up = (p: Partial<DepoimentosConfig>) => onChange({ ...c, ...p });
  return (
    <div className="flex flex-col gap-3">
      <Campo label="Rótulo" value={c.eyebrow} onChange={(v) => up({ eyebrow: v })} />
      <Campo label="Título" value={c.titulo} onChange={(v) => up({ titulo: v })} />
      <ArrayEditor
        label="Depoimentos"
        itens={c.itens ?? []}
        onChange={(v) => up({ itens: v })}
        novo={() => ({ texto: "Depoimento incrível!", autor: "Cliente" })}
        render={(item, patch) => (
          <div className="grid gap-2">
            <Area label="Texto" value={item.texto} onChange={(v) => patch({ texto: v })} />
            <Campo label="Autor" value={item.autor} onChange={(v) => patch({ autor: v })} />
            <UploadInput orgId={orgId} pasta="depo" label="Foto (opcional)" value={item.foto_url ?? ""} onChange={(v) => patch({ foto_url: v })} />
          </div>
        )}
      />
    </div>
  );
}

function FaqForm({ value, onChange }: FormProps) {
  const c = value as FaqConfig;
  const up = (p: Partial<FaqConfig>) => onChange({ ...c, ...p });
  return (
    <div className="flex flex-col gap-3">
      <Campo label="Rótulo" value={c.eyebrow} onChange={(v) => up({ eyebrow: v })} />
      <Campo label="Título" value={c.titulo} onChange={(v) => up({ titulo: v })} />
      <ArrayEditor
        label="Perguntas"
        itens={c.itens ?? []}
        onChange={(v) => up({ itens: v })}
        novo={() => ({ pergunta: "Pergunta?", resposta: "Resposta." })}
        render={(item, patch) => (
          <div className="grid gap-2">
            <Campo label="Pergunta" value={item.pergunta} onChange={(v) => patch({ pergunta: v })} />
            <Area label="Resposta" value={item.resposta} onChange={(v) => patch({ resposta: v })} />
          </div>
        )}
      />
    </div>
  );
}

function OfertaForm({ value, onChange }: FormProps) {
  const c = value as OfertaConfig;
  const up = (p: Partial<OfertaConfig>) => onChange({ ...c, ...p });
  return (
    <div className="flex flex-col gap-3">
      <Campo label="Rótulo" value={c.eyebrow} onChange={(v) => up({ eyebrow: v })} />
      <Campo label="Título" value={c.titulo} onChange={(v) => up({ titulo: v })} />
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Preço (R$)</label>
          <input type="number" step="0.01" className={inputClass} value={c.preco ?? ""} onChange={(e) => up({ preco: e.target.value === "" ? undefined : Number(e.target.value) })} />
        </div>
        <Campo label="Sufixo (ex: à vista)" value={c.preco_sufixo} onChange={(v) => up({ preco_sufixo: v })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Contagem regressiva até (opcional)</label>
        <input type="datetime-local" className={inputClass} value={toLocal(c.data_limite)} onChange={(e) => up({ data_limite: e.target.value ? new Date(`${e.target.value}:00-03:00`).toISOString() : null })} />
      </div>
      <BotaoEditor value={c.botao ?? { texto: "Comprar", href: "#" }} onChange={(b) => up({ botao: b })} />
      <Campo label="Aviso (opcional)" value={c.aviso} onChange={(v) => up({ aviso: v })} />
    </div>
  );
}

function toLocal(iso?: string | null) {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const g = (t: string) => parts.find((p) => p.type === t)?.value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

function FormularioForm({ value, onChange }: FormProps) {
  const c = value as FormularioConfig;
  const up = (p: Partial<FormularioConfig>) => onChange({ ...c, ...p });
  return (
    <div className="flex flex-col gap-3">
      <Campo label="Rótulo" value={c.eyebrow} onChange={(v) => up({ eyebrow: v })} />
      <Campo label="Título" value={c.titulo} onChange={(v) => up({ titulo: v })} />
      <Area label="Subtítulo" value={c.subtitulo} onChange={(v) => up({ subtitulo: v })} />
      <ArrayEditor
        label="Campos do formulário"
        itens={c.campos ?? []}
        onChange={(v) => up({ campos: v })}
        novo={() => ({ nome: "Campo", tipo: "texto", obrigatorio: false }) as CampoFormulario}
        render={(item, patch) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <Campo label="Nome do campo" value={item.nome} onChange={(v) => patch({ nome: v })} />
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Tipo</label>
              <select className={inputClass} value={item.tipo} onChange={(e) => patch({ tipo: e.target.value as "texto" | "email" | "telefone" })}>
                <option value="texto">Texto</option>
                <option value="email">Email</option>
                <option value="telefone">Telefone</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-paper-dim">
              <input type="checkbox" checked={item.obrigatorio ?? false} onChange={(e) => patch({ obrigatorio: e.target.checked })} />
              Obrigatório
            </label>
          </div>
        )}
      />
      <Campo label="Texto do botão" value={c.botao_texto} onChange={(v) => up({ botao_texto: v })} />
      <Area label="Mensagem de sucesso" value={c.mensagem_sucesso} onChange={(v) => up({ mensagem_sucesso: v })} />
    </div>
  );
}

function LogosForm({ value, onChange, orgId }: FormProps) {
  const c = value as LogosConfig;
  const up = (p: Partial<LogosConfig>) => onChange({ ...c, ...p });
  return (
    <div className="flex flex-col gap-3">
      <Campo label="Rótulo" value={c.eyebrow} onChange={(v) => up({ eyebrow: v })} />
      <Campo label="Título" value={c.titulo} onChange={(v) => up({ titulo: v })} />
      <ArrayEditor
        label="Logos"
        itens={c.logos ?? []}
        onChange={(v) => up({ logos: v })}
        novo={() => ({ imagem_url: "" }) as LogoItem}
        render={(item, patch) => (
          <div className="grid gap-2">
            <UploadInput orgId={orgId} pasta="logos" label="Logo" value={item.imagem_url} onChange={(v) => patch({ imagem_url: v })} />
            <Campo label="Link (opcional)" value={item.href} onChange={(v) => patch({ href: v })} />
          </div>
        )}
      />
    </div>
  );
}

function RodapeForm({ value, onChange }: FormProps) {
  const c = value as RodapeConfig;
  const up = (p: Partial<RodapeConfig>) => onChange({ ...c, ...p });
  return (
    <div className="flex flex-col gap-3">
      <Campo label="Nome/Texto" value={c.texto} onChange={(v) => up({ texto: v })} />
      <Campo label="Contato (telefone/email)" value={c.contato} onChange={(v) => up({ contato: v })} />
      <Campo label="Instagram (link)" value={c.instagram_url} onChange={(v) => up({ instagram_url: v })} />
      <Campo label="Facebook (link)" value={c.facebook_url} onChange={(v) => up({ facebook_url: v })} />
      <Campo label="Site (link)" value={c.site_url} onChange={(v) => up({ site_url: v })} />
    </div>
  );
}

function AvisoForm({ value, onChange }: FormProps) {
  const c = value as AvisoConfig;
  const up = (p: Partial<AvisoConfig>) => onChange({ ...c, ...p });
  return (
    <div className="flex flex-col gap-3">
      <Campo label="Texto do aviso" value={c.texto} onChange={(v) => up({ texto: v })} />
      <div className="grid gap-2 sm:grid-cols-2">
        <Campo label="Texto do link (opcional)" value={c.link_texto} onChange={(v) => up({ link_texto: v })} />
        <Campo label="Link" value={c.href} onChange={(v) => up({ href: v })} placeholder="#oferta" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Cor de destaque</label>
        <select className={inputClass} value={c.cor ?? "gold"} onChange={(e) => up({ cor: e.target.value as AvisoConfig["cor"] })}>
          <option value="gold">Dourado</option>
          <option value="coral">Coral</option>
          <option value="green">Verde</option>
          <option value="violet">Violeta</option>
        </select>
      </div>
    </div>
  );
}

function EstatisticasForm({ value, onChange }: FormProps) {
  const c = value as EstatisticasConfig;
  const up = (p: Partial<EstatisticasConfig>) => onChange({ ...c, ...p });
  return (
    <div className="flex flex-col gap-3">
      <Campo label="Rótulo (opcional)" value={c.eyebrow} onChange={(v) => up({ eyebrow: v })} />
      <Campo label="Título (opcional)" value={c.titulo} onChange={(v) => up({ titulo: v })} />
      <ArrayEditor
        label="Números"
        itens={c.itens ?? []}
        onChange={(v) => up({ itens: v })}
        novo={() => ({ numero: "+100", rotulo: "clientes" })}
        render={(item, patch) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <Campo label="Número (ex: +2.000)" value={item.numero} onChange={(v) => patch({ numero: v })} />
            <Campo label="Rótulo" value={item.rotulo} onChange={(v) => patch({ rotulo: v })} />
          </div>
        )}
      />
    </div>
  );
}

function PassosForm({ value, onChange }: FormProps) {
  const c = value as PassosConfig;
  const up = (p: Partial<PassosConfig>) => onChange({ ...c, ...p });
  return (
    <div className="flex flex-col gap-3">
      <Campo label="Rótulo" value={c.eyebrow} onChange={(v) => up({ eyebrow: v })} />
      <Campo label="Título" value={c.titulo} onChange={(v) => up({ titulo: v })} />
      <Area label="Subtítulo (opcional)" value={c.subtitulo} onChange={(v) => up({ subtitulo: v })} />
      <ArrayEditor
        label="Passos"
        itens={c.itens ?? []}
        onChange={(v) => up({ itens: v })}
        novo={() => ({ titulo: "Novo passo", texto: "" })}
        render={(item, patch) => (
          <div className="grid gap-2">
            <Campo label="Título" value={item.titulo} onChange={(v) => patch({ titulo: v })} />
            <Area label="Texto" value={item.texto} onChange={(v) => patch({ texto: v })} />
          </div>
        )}
      />
    </div>
  );
}

function PlanosForm({ value, onChange }: FormProps) {
  const c = value as PlanosConfig;
  const up = (p: Partial<PlanosConfig>) => onChange({ ...c, ...p });
  return (
    <div className="flex flex-col gap-3">
      <Campo label="Rótulo" value={c.eyebrow} onChange={(v) => up({ eyebrow: v })} />
      <Campo label="Título" value={c.titulo} onChange={(v) => up({ titulo: v })} />
      <ArrayEditor
        label="Planos"
        itens={c.itens ?? []}
        onChange={(v) => up({ itens: v })}
        novo={() =>
          ({
            nome: "Novo plano",
            preco: 97,
            preco_sufixo: "/mês",
            itens: ["Benefício"],
            botao: { texto: "Assinar", href: "#", estilo: "secundario" },
          }) as PlanoItem
        }
        render={(item, patch) => (
          <div className="grid gap-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <Campo label="Nome do plano" value={item.nome} onChange={(v) => patch({ nome: v })} />
              <Campo label="Descrição curta" value={item.descricao} onChange={(v) => patch({ descricao: v })} />
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Preço (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={item.preco ?? ""}
                  onChange={(e) => patch({ preco: e.target.value === "" ? undefined : Number(e.target.value) })}
                />
              </div>
              <Campo label="Sufixo (ex: /mês)" value={item.preco_sufixo} onChange={(v) => patch({ preco_sufixo: v })} />
            </div>
            <label className="flex items-center gap-2 text-sm text-paper-dim">
              <input
                type="checkbox"
                checked={item.destaque ?? false}
                onChange={(e) => patch({ destaque: e.target.checked })}
              />
              Plano em destaque
            </label>
            {item.destaque && (
              <Campo label="Selo (ex: Mais popular)" value={item.selo} onChange={(v) => patch({ selo: v })} />
            )}
            <Area
              label="Benefícios (um por linha)"
              value={(item.itens ?? []).join("\n")}
              onChange={(v) => patch({ itens: v.split("\n").filter((s) => s.trim() !== "") })}
            />
            <BotaoEditor
              value={item.botao ?? { texto: "Assinar", href: "#" }}
              onChange={(b) => patch({ botao: b })}
            />
          </div>
        )}
      />
    </div>
  );
}

function GarantiaForm({ value, onChange }: FormProps) {
  const c = value as GarantiaConfig;
  const up = (p: Partial<GarantiaConfig>) => onChange({ ...c, ...p });
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Campo label="Emoji" value={c.emoji} onChange={(v) => up({ emoji: v })} placeholder="🛡️" />
        <Campo label="Selo (ex: Garantia de 7 dias)" value={c.selo} onChange={(v) => up({ selo: v })} />
      </div>
      <Campo label="Título" value={c.titulo} onChange={(v) => up({ titulo: v })} />
      <Area label="Texto" value={c.texto} onChange={(v) => up({ texto: v })} />
    </div>
  );
}

function MidiaTextoForm({ value, onChange, orgId }: FormProps) {
  const c = value as MidiaTextoConfig;
  const up = (p: Partial<MidiaTextoConfig>) => onChange({ ...c, ...p });
  return (
    <div className="flex flex-col gap-3">
      <Campo label="Rótulo" value={c.eyebrow} onChange={(v) => up({ eyebrow: v })} />
      <Campo label="Título" value={c.titulo} onChange={(v) => up({ titulo: v })} />
      <Area label="Texto" value={c.corpo} onChange={(v) => up({ corpo: v })} />
      <UploadInput orgId={orgId} pasta="midiatexto" label="Imagem" value={c.imagem_url ?? ""} onChange={(v) => up({ imagem_url: v })} />
      <Campo label="Ou vídeo — link YouTube/Shorts (opcional)" value={c.video_url ?? ""} onChange={(v) => up({ video_url: v })} />
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Posição da mídia</label>
        <select className={inputClass} value={c.posicao ?? "esquerda"} onChange={(e) => up({ posicao: e.target.value as MidiaTextoConfig["posicao"] })}>
          <option value="esquerda">Mídia à esquerda</option>
          <option value="direita">Mídia à direita</option>
        </select>
      </div>
      <Area
        label="Checks (um por linha, opcional)"
        value={(c.itens ?? []).join("\n")}
        onChange={(v) => up({ itens: v.split("\n").filter((s) => s.trim() !== "") })}
      />
      <BotaoEditor value={c.botao ?? { texto: "", href: "#" }} onChange={(b) => up({ botao: b })} />
    </div>
  );
}

function HtmlForm({ value, onChange }: FormProps) {
  const c = value as HtmlConfig;
  const up = (p: Partial<HtmlConfig>) => onChange({ ...c, ...p });
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2.5 text-xs text-paper">
        ⚠️ Cole aqui apenas código de fontes que você confia (Kiwify, Hotmart, Google, Meta…). Ele
        roda no navegador de quem visita a sua página.
      </div>
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Código HTML / embed</label>
        <textarea
          className={`${inputClass} font-mono text-xs`}
          rows={8}
          spellCheck={false}
          value={c.html ?? ""}
          placeholder='Cole aqui o código, ex: o botão da Kiwify com <script src="...">'
          onChange={(e) => up({ html: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Largura</label>
        <select
          className={inputClass}
          value={c.largura ?? "media"}
          onChange={(e) => up({ largura: e.target.value as HtmlConfig["largura"] })}
        >
          <option value="media">Centralizado (recomendado)</option>
          <option value="total">Largura total</option>
        </select>
      </div>
      <p className="text-xs text-paper-dim">
        Dica: o botão de 1 clique da Kiwify precisa que a pessoa já tenha passado pelo checkout —
        funciona nas páginas de upsell/obrigado do funil.
      </p>
    </div>
  );
}

const FORMS: Record<string, (p: FormProps) => React.ReactNode> = {
  cabecalho: CabecalhoForm,
  hero: HeroForm,
  texto: TextoForm,
  imagem: ImagemForm,
  video: VideoForm,
  cta: CtaForm,
  cards: CardsForm,
  lista: ListaForm,
  galeria: GaleriaForm,
  depoimentos: DepoimentosForm,
  faq: FaqForm,
  oferta: OfertaForm,
  formulario: FormularioForm,
  logos: LogosForm,
  rodape: RodapeForm,
  aviso: AvisoForm,
  estatisticas: EstatisticasForm,
  passos: PassosForm,
  planos: PlanosForm,
  garantia: GarantiaForm,
  midiatexto: MidiaTextoForm,
  html: HtmlForm,
};

export default function BlockForm({ tipo, ...props }: FormProps & { tipo: string }) {
  const Form = FORMS[tipo];
  if (!Form) return <p className="text-sm text-paper-dim">Este bloco não tem edição.</p>;
  return <Form {...props} />;
}
