import { Fragment, cloneElement, isValidElement, type CSSProperties, type ReactElement } from "react";
import AtrasoReveal from "./AtrasoReveal";
import HtmlEmbed from "./HtmlEmbed";
import VideoPlayer from "@/components/site/VideoPlayer";
import Faq from "@/components/site/Faq";
import Countdown from "@/components/site/Countdown";
import FormularioBloco from "./FormularioBloco";
import { isVerticalVideo } from "@/lib/video";
import { formatPrice } from "@/lib/format";
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
  LogosConfig,
  RodapeConfig,
  HtmlConfig,
  AvisoConfig,
  EstatisticasConfig,
  PassosConfig,
  PlanosConfig,
  GarantiaConfig,
  MidiaTextoConfig,
} from "@/lib/blocks/types";
import { normalizarItemLista } from "@/lib/blocks/types";

export type RenderCtx = {
  siteNome: string;
  logoUrl: string | null;
  siteId: string;
  orgId: string;
  paginaId: string | null;
  preview?: boolean; // na prévia do editor, mostra tudo (ignora o atraso)
};

type Bloco = { id: string; tipo: string; config: Record<string, unknown> };

function Botao({ b }: { b: BotaoConfig }) {
  return (
    <a
      className={`pp-btn ${b.estilo === "secundario" ? "pp-btn-secundario" : "pp-btn-primario"}`}
      href={b.href || "#"}
      data-track={b.rastreio || b.texto}
    >
      {b.texto}
    </a>
  );
}

function Head({ eyebrow, titulo }: { eyebrow?: string; titulo?: string }) {
  if (!eyebrow && !titulo) return null;
  return (
    <div className="pp-head" style={{ marginBottom: 26 }}>
      {eyebrow && <div className="pp-eyebrow">{eyebrow}</div>}
      {titulo && <h2>{titulo}</h2>}
    </div>
  );
}

/* eslint-disable @next/next/no-img-element */

function renderBloco(bloco: Bloco, ctx: RenderCtx) {
  const c = bloco.config;
  switch (bloco.tipo) {
    case "cabecalho": {
      const cfg = c as CabecalhoConfig;
      const logo = cfg.logo_url || ctx.logoUrl;
      return (
        <header className="pp-header">
          <div className="pp-header-inner">
            {logo ? (
              <img className="pp-logo-img" src={logo} alt={cfg.nome || ctx.siteNome} />
            ) : (
              <div className="pp-logo-txt">{cfg.nome || ctx.siteNome}</div>
            )}
            {cfg.botao?.texto && <Botao b={cfg.botao} />}
          </div>
        </header>
      );
    }
    case "hero": {
      const cfg = c as HeroConfig;
      const center = (cfg.alinhamento ?? "centro") === "centro";
      const vertical = cfg.video_url ? isVerticalVideo(cfg.video_url) : false;
      const botoes = (cfg.botoes?.length ?? 0) > 0 && (
        <div className="pp-btn-row">
          {cfg.botoes!.map((b, i) => (
            <Botao key={i} b={b} />
          ))}
        </div>
      );
      const midia = cfg.video_url ? (
        <div
          className="pp-hero-media"
          style={vertical ? { maxWidth: 330, aspectRatio: "9/16" } : undefined}
        >
          <VideoPlayer
            url={cfg.video_url}
            poster={cfg.imagem_url}
            title={cfg.titulo}
            opcoes={cfg.video_opcoes}
          />
        </div>
      ) : cfg.imagem_url ? (
        <div className="pp-hero-media">
          <img src={cfg.imagem_url} alt="" />
        </div>
      ) : null;
      // Por padrão os botões vêm antes da mídia; a opção inverte a ordem.
      const botoesDepois = Boolean(cfg.botoes_abaixo_midia) && Boolean(midia);
      return (
        <section className={`pp-hero ${center ? "pp-center" : ""}`}>
          <div className="pp-wrap pp-hero-inner">
            {cfg.selo && <span className="pp-badge">{cfg.selo}</span>}
            <h1>{cfg.titulo}</h1>
            {cfg.subtitulo && <p className="pp-hero-sub">{cfg.subtitulo}</p>}
            {!botoesDepois && botoes}
            {midia}
            {botoesDepois && botoes}
          </div>
        </section>
      );
    }
    case "texto": {
      const cfg = c as TextoConfig;
      const center = (cfg.alinhamento ?? "centro") === "centro";
      return (
        <section className={`pp-section ${center ? "pp-center" : ""}`}>
          <div className="pp-wrap">
            {cfg.eyebrow && <div className="pp-eyebrow">{cfg.eyebrow}</div>}
            {cfg.titulo && <h2 style={{ fontSize: "clamp(26px,5vw,40px)" }}>{cfg.titulo}</h2>}
            {cfg.corpo && (
              <p
                style={{
                  color: "var(--color-cream-dim)",
                  fontSize: 17,
                  lineHeight: 1.65,
                  marginTop: 14,
                  maxWidth: center ? 640 : undefined,
                  marginInline: center ? "auto" : undefined,
                }}
              >
                {cfg.corpo}
              </p>
            )}
          </div>
        </section>
      );
    }
    case "imagem": {
      const cfg = c as ImagemConfig;
      if (!cfg.imagem_url) return null;
      return (
        <section className="pp-section">
          <div className="pp-wrap">
            <div className={`pp-img-block ${cfg.largura === "media" ? "pp-media-media" : ""}`}>
              <img src={cfg.imagem_url} alt={cfg.legenda || ""} />
              {cfg.legenda && <div className="pp-legenda">{cfg.legenda}</div>}
            </div>
          </div>
        </section>
      );
    }
    case "video": {
      const cfg = c as VideoConfig;
      if (!cfg.video_url) return null;
      const vertical = isVerticalVideo(cfg.video_url);
      return (
        <section className="pp-section">
          <div className="pp-wrap">
            {cfg.titulo && (
              <h2 className="pp-center" style={{ fontSize: "clamp(24px,5vw,36px)", marginBottom: 20 }}>
                {cfg.titulo}
              </h2>
            )}
            <div
              className="pp-media-wrap pp-media-media"
              style={vertical ? { maxWidth: 330, aspectRatio: "9/16" } : undefined}
            >
              <VideoPlayer
                url={cfg.video_url}
                poster={cfg.poster_url}
                title={cfg.titulo || "Vídeo"}
                opcoes={cfg.video_opcoes}
              />
            </div>
          </div>
        </section>
      );
    }
    case "cta": {
      const cfg = c as CtaConfig;
      return (
        <section className="pp-section pp-center">
          <div className="pp-wrap">
            {cfg.titulo && <h2 style={{ fontSize: "clamp(26px,5vw,40px)" }}>{cfg.titulo}</h2>}
            {cfg.subtitulo && (
              <p style={{ color: "var(--color-cream-dim)", fontSize: 17, marginTop: 12 }}>
                {cfg.subtitulo}
              </p>
            )}
            {cfg.botao?.texto && (
              <div className="pp-btn-row">
                <Botao b={cfg.botao} />
              </div>
            )}
          </div>
        </section>
      );
    }
    case "cards": {
      const cfg = c as CardsConfig;
      return (
        <section className="pp-section pp-center">
          <div className="pp-wrap">
            <Head eyebrow={cfg.eyebrow} titulo={cfg.titulo} />
            <div className="pp-cards" data-cols={String(cfg.colunas ?? 3)}>
              {(cfg.itens ?? []).map((item, i) => (
                <div key={i} className="pp-card" style={{ textAlign: "left" }}>
                  {item.emoji && <span className="pp-emoji">{item.emoji}</span>}
                  <h3>{item.titulo}</h3>
                  {item.texto && <p>{item.texto}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }
    case "lista": {
      const cfg = c as ListaConfig;
      return (
        <section className="pp-section pp-center">
          <div className="pp-wrap">
            <Head eyebrow={cfg.eyebrow} titulo={cfg.titulo} />
            <ul className="pp-lista" style={{ textAlign: "left" }}>
              {(cfg.itens ?? []).map((bruto, i) => {
                const item = normalizarItemLista(bruto);
                return (
                  <li key={i} data-marca={item.marca}>
                    <b aria-hidden="true">{item.marca === "x" ? "✕" : "✓"}</b> {item.texto}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      );
    }
    case "galeria": {
      const cfg = c as GaleriaConfig;
      const imgs = cfg.imagens ?? [];
      if (imgs.length === 0) return null;
      return (
        <section className="pp-section pp-center">
          <div className="pp-wrap">
            <Head eyebrow={cfg.eyebrow} titulo={cfg.titulo} />
            <div className="pp-galeria">
              {imgs.map((src, i) => (
                <img key={i} src={src} alt="" />
              ))}
            </div>
          </div>
        </section>
      );
    }
    case "depoimentos": {
      const cfg = c as DepoimentosConfig;
      const itens = cfg.itens ?? [];
      return (
        <section className="pp-section pp-center">
          <div className="pp-wrap">
            <Head eyebrow={cfg.eyebrow} titulo={cfg.titulo} />
            <div className="pp-depos" data-n={String(Math.min(3, itens.length))}>
              {itens.map((d, i) => (
                <div key={i} className="pp-depo" style={{ textAlign: "left" }}>
                  <q>{d.texto}</q>
                  {(d.autor || d.foto_url) && (
                    <div className="pp-depo-autor">
                      {d.foto_url && <img src={d.foto_url} alt="" />}
                      {d.autor && <span>{d.autor}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }
    case "faq": {
      const cfg = c as FaqConfig;
      const items = (cfg.itens ?? []).map((it, i) => ({
        id: String(i),
        pergunta: it.pergunta,
        resposta: it.resposta,
      }));
      return (
        <section className="pp-section">
          <div className="pp-wrap" style={{ maxWidth: 720 }}>
            <Head eyebrow={cfg.eyebrow} titulo={cfg.titulo} />
            <Faq items={items} />
          </div>
        </section>
      );
    }
    case "oferta": {
      const cfg = c as OfertaConfig;
      return (
        <section className="pp-section" id="oferta">
          <div className="pp-wrap">
            <div className="pp-oferta">
              {cfg.eyebrow && <div className="pp-eyebrow" style={{ textAlign: "center" }}>{cfg.eyebrow}</div>}
              {cfg.titulo && <h2 style={{ fontSize: "clamp(24px,5vw,34px)" }}>{cfg.titulo}</h2>}
              {cfg.data_limite && <Countdown target={cfg.data_limite} />}
              {typeof cfg.preco === "number" && (
                <div className="pp-preco">
                  {formatPrice(cfg.preco)} {cfg.preco_sufixo && <small>{cfg.preco_sufixo}</small>}
                </div>
              )}
              {cfg.botao?.texto && (
                <div className="pp-btn-row" style={{ justifyContent: "center" }}>
                  <Botao b={cfg.botao} />
                </div>
              )}
              {cfg.aviso && <p className="pp-aviso">{cfg.aviso}</p>}
            </div>
          </div>
        </section>
      );
    }
    case "formulario": {
      const cfg = c as FormularioConfig;
      return (
        <section className="pp-section pp-center" id="contato">
          <div className="pp-wrap">
            <Head eyebrow={cfg.eyebrow} titulo={cfg.titulo} />
            {cfg.subtitulo && (
              <p style={{ color: "var(--color-cream-dim)", marginTop: -14, marginBottom: 20 }}>
                {cfg.subtitulo}
              </p>
            )}
            <FormularioBloco
              config={cfg}
              siteId={ctx.siteId}
              orgId={ctx.orgId}
              paginaId={ctx.paginaId}
            />
          </div>
        </section>
      );
    }
    case "logos": {
      const cfg = c as LogosConfig;
      const logos = cfg.logos ?? [];
      if (logos.length === 0) return null;
      return (
        <section className="pp-section pp-center">
          <div className="pp-wrap">
            <Head eyebrow={cfg.eyebrow} titulo={cfg.titulo} />
            <div className="pp-logos">
              {logos.map((l, i) =>
                l.href ? (
                  <a key={i} href={l.href}>
                    <img src={l.imagem_url} alt="" />
                  </a>
                ) : (
                  <img key={i} src={l.imagem_url} alt="" />
                ),
              )}
            </div>
          </div>
        </section>
      );
    }
    case "aviso": {
      const cfg = c as AvisoConfig;
      if (!cfg.texto) return null;
      return (
        <div className="pp-aviso-bar" data-cor={cfg.cor ?? "gold"}>
          <div className="pp-wrap pp-aviso-inner">
            <span>{cfg.texto}</span>
            {cfg.link_texto && (
              <a href={cfg.href || "#"} data-track="BarraAviso">
                {cfg.link_texto} →
              </a>
            )}
          </div>
        </div>
      );
    }
    case "estatisticas": {
      const cfg = c as EstatisticasConfig;
      const itens = cfg.itens ?? [];
      if (itens.length === 0) return null;
      return (
        <section className="pp-section pp-center">
          <div className="pp-wrap">
            <Head eyebrow={cfg.eyebrow} titulo={cfg.titulo} />
            <div className="pp-stats" data-n={String(Math.min(4, itens.length))}>
              {itens.map((s, i) => (
                <div key={i} className="pp-stat">
                  <b>{s.numero}</b>
                  <span>{s.rotulo}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }
    case "passos": {
      const cfg = c as PassosConfig;
      const itens = cfg.itens ?? [];
      return (
        <section className="pp-section pp-center">
          <div className="pp-wrap">
            <Head eyebrow={cfg.eyebrow} titulo={cfg.titulo} />
            {cfg.subtitulo && <p className="pp-sub-solto">{cfg.subtitulo}</p>}
            <div className="pp-passos" data-n={String(Math.min(4, itens.length))}>
              {itens.map((p, i) => (
                <div key={i} className="pp-passo">
                  <span className="pp-passo-num">{i + 1}</span>
                  <h3>{p.titulo}</h3>
                  {p.texto && <p>{p.texto}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }
    case "planos": {
      const cfg = c as PlanosConfig;
      const itens = cfg.itens ?? [];
      if (itens.length === 0) return null;
      return (
        <section className="pp-section pp-center" id="planos">
          <div className="pp-wrap">
            <Head eyebrow={cfg.eyebrow} titulo={cfg.titulo} />
            {cfg.subtitulo && <p className="pp-sub-solto">{cfg.subtitulo}</p>}
            <div className="pp-planos" data-n={String(Math.min(3, itens.length))}>
              {itens.map((p, i) => (
                <div key={i} className={`pp-plano ${p.destaque ? "pp-plano-destaque" : ""}`}>
                  {p.selo && <span className="pp-plano-selo">{p.selo}</span>}
                  <h3>{p.nome}</h3>
                  {p.descricao && <p className="pp-plano-desc">{p.descricao}</p>}
                  {typeof p.preco === "number" && (
                    <div className="pp-plano-preco">
                      {formatPrice(p.preco)}
                      {p.preco_sufixo && <small>{p.preco_sufixo}</small>}
                    </div>
                  )}
                  {(p.itens?.length ?? 0) > 0 && (
                    <ul className="pp-plano-lista">
                      {p.itens!.map((item, j) => (
                        <li key={j}>
                          <b aria-hidden="true">✓</b> {item}
                        </li>
                      ))}
                    </ul>
                  )}
                  {p.botao?.texto && (
                    <div style={{ marginTop: "auto", paddingTop: 20 }}>
                      <Botao b={p.botao} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }
    case "garantia": {
      const cfg = c as GarantiaConfig;
      return (
        <section className="pp-section">
          <div className="pp-wrap">
            <div className="pp-garantia">
              <span className="pp-garantia-emoji">{cfg.emoji || "🛡️"}</span>
              <div>
                {cfg.selo && <span className="pp-garantia-selo">{cfg.selo}</span>}
                {cfg.titulo && <h3>{cfg.titulo}</h3>}
                {cfg.texto && <p>{cfg.texto}</p>}
              </div>
            </div>
          </div>
        </section>
      );
    }
    case "midiatexto": {
      const cfg = c as MidiaTextoConfig;
      const midiaDireita = cfg.posicao === "direita";
      const vertical = cfg.video_url ? isVerticalVideo(cfg.video_url) : false;
      const temMidia = Boolean(cfg.video_url || cfg.imagem_url);
      return (
        <section className="pp-section">
          <div className={`pp-wrap pp-mt ${midiaDireita ? "pp-mt-invertido" : ""} ${temMidia ? "" : "pp-mt-so-texto"}`}>
            {temMidia && (
              <div
                className="pp-mt-midia"
                style={vertical ? { maxWidth: 320, aspectRatio: "9/16" } : undefined}
              >
                {cfg.video_url ? (
                  <VideoPlayer url={cfg.video_url} poster={cfg.imagem_url} title={cfg.titulo || "Vídeo"} />
                ) : (
                  <img src={cfg.imagem_url!} alt={cfg.titulo || ""} />
                )}
              </div>
            )}
            <div className="pp-mt-texto">
              {cfg.eyebrow && <div className="pp-eyebrow">{cfg.eyebrow}</div>}
              {cfg.titulo && <h2>{cfg.titulo}</h2>}
              {cfg.corpo && <p className="pp-mt-corpo">{cfg.corpo}</p>}
              {(cfg.itens?.length ?? 0) > 0 && (
                <ul className="pp-lista" style={{ marginTop: 18 }}>
                  {cfg.itens!.map((item, i) => (
                    <li key={i}>
                      <b aria-hidden="true">✓</b> {item}
                    </li>
                  ))}
                </ul>
              )}
              {cfg.botao?.texto && (
                <div className="pp-btn-row">
                  <Botao b={cfg.botao} />
                </div>
              )}
            </div>
          </div>
        </section>
      );
    }
    case "html": {
      const cfg = c as HtmlConfig;
      if (!cfg.html?.trim()) return null;
      return (
        <section className="pp-section">
          <div className={`pp-wrap ${cfg.largura === "media" ? "pp-html-media" : ""}`}>
            <HtmlEmbed html={cfg.html} />
          </div>
        </section>
      );
    }
    case "rodape": {
      const cfg = c as RodapeConfig;
      return (
        <footer className="pp-footer">
          <div className="pp-wrap">
            <div className="pp-logo-txt">{cfg.texto || ctx.siteNome}</div>
            <div className="pp-social">
              {cfg.instagram_url && <a href={cfg.instagram_url}>Instagram</a>}
              {cfg.facebook_url && <a href={cfg.facebook_url}>Facebook</a>}
              {cfg.site_url && <a href={cfg.site_url}>Site</a>}
            </div>
            {cfg.contato && <div className="pp-fine">{cfg.contato}</div>}
          </div>
        </footer>
      );
    }
    default:
      return null;
  }
}

export default function BlockRenderer({ blocos, ctx }: { blocos: Bloco[]; ctx: RenderCtx }) {
  // Sem wrapper por bloco: um <div> em volta quebraria o position:sticky do
  // cabeçalho (sticky só "gruda" dentro do elemento pai). Exceção: blocos com
  // "aparecer após X segundos" precisam do wrapper AtrasoReveal.
  return (
    <>
      {blocos.map((bloco) => {
        const meta = bloco.config as {
          _aparecer_apos?: number;
          _pad_topo?: number;
          _pad_baixo?: number;
        };
        const atraso = ctx.preview ? 0 : Number(meta._aparecer_apos) || 0;
        let conteudo = renderBloco(bloco, ctx);

        // Espaçamento por bloco: sobrescreve o padding vertical da seção.
        if (
          (meta._pad_topo != null || meta._pad_baixo != null) &&
          isValidElement(conteudo)
        ) {
          const el = conteudo as ReactElement<{ style?: CSSProperties }>;
          const estilo: CSSProperties = { ...(el.props.style ?? {}) };
          if (meta._pad_topo != null) estilo.paddingTop = meta._pad_topo;
          if (meta._pad_baixo != null) estilo.paddingBottom = meta._pad_baixo;
          conteudo = cloneElement(el, { style: estilo });
        }

        return atraso > 0 ? (
          <AtrasoReveal key={bloco.id} segundos={atraso}>
            {conteudo}
          </AtrasoReveal>
        ) : (
          <Fragment key={bloco.id}>{conteudo}</Fragment>
        );
      })}
    </>
  );
}
