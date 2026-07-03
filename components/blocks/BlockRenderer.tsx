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
} from "@/lib/blocks/types";

export type RenderCtx = {
  siteNome: string;
  logoUrl: string | null;
  siteId: string;
  orgId: string;
  paginaId: string | null;
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
      return (
        <section className={`pp-hero ${center ? "pp-center" : ""}`}>
          <div className="pp-wrap pp-hero-inner">
            {cfg.selo && <span className="pp-badge">{cfg.selo}</span>}
            <h1>{cfg.titulo}</h1>
            {cfg.subtitulo && <p className="pp-hero-sub">{cfg.subtitulo}</p>}
            {(cfg.botoes?.length ?? 0) > 0 && (
              <div className="pp-btn-row">
                {cfg.botoes!.map((b, i) => (
                  <Botao key={i} b={b} />
                ))}
              </div>
            )}
            {cfg.video_url ? (
              <div
                className="pp-hero-media"
                style={vertical ? { maxWidth: 330, aspectRatio: "9/16" } : undefined}
              >
                <VideoPlayer url={cfg.video_url} poster={cfg.imagem_url} title={cfg.titulo} />
              </div>
            ) : cfg.imagem_url ? (
              <div className="pp-hero-media">
                <img src={cfg.imagem_url} alt="" />
              </div>
            ) : null}
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
              <VideoPlayer url={cfg.video_url} poster={cfg.poster_url} title={cfg.titulo || "Vídeo"} />
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
              {(cfg.itens ?? []).map((item, i) => (
                <li key={i}>
                  <b aria-hidden="true">✓</b> {item}
                </li>
              ))}
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
  return (
    <>
      {blocos.map((bloco) => (
        <div key={bloco.id}>{renderBloco(bloco, ctx)}</div>
      ))}
    </>
  );
}
